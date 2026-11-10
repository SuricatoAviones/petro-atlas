import { Router, type Response } from 'express';
import { z } from 'zod';

import { WELL_ALERT_LEVEL_SQL } from '../alert-level.ts';
import type { Database } from '../database.ts';
import { HttpError } from '../http-errors.ts';
import { parseParams, setReadCacheHeader } from '../params.ts';
import { createSqlFilter, type SqlFilter } from '../sql-filter.ts';
import { WELL_FILTER_FROM, addWellFilters, wellFilterSchema } from '../well-filters.ts';

/** Up to this zoom, wells that fall in the same grid cell of a tile are served as one cluster. */
export const CLUSTER_MAX_ZOOM = 8;
/** Cells per tile side used for clustering: 8 × 8 cells, 64 px each on a 512 px tile. */
const CLUSTER_GRID_SIZE = 8;
const TILE_EXTENT = 4096;
/** Margin around a tile, in tile units, so symbols are not cut at tile edges. */
const TILE_BUFFER = 64;
const MAX_ZOOM = 22;
export const TILE_CONTENT_TYPE = 'application/vnd.mapbox-vector-tile';

const tileParamsSchema = z.object({
  z: z.coerce.number().int().min(0).max(MAX_ZOOM),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
});

const WELL_PROPERTIES =
  'id, name, slug, well_type AS "wellType", status, alert_level AS "alertLevel"';

/** Validates `z/x/y` and returns them as placeholders of `filter`, ready for ST_TileEnvelope. */
function tileArguments(filter: SqlFilter, params: unknown): { zoom: number; tile: string } {
  const { z: zoom, x, y } = parseParams(tileParamsSchema, params);
  if (x >= 2 ** zoom || y >= 2 ** zoom) {
    throw new HttpError(400, 'INVALID_PARAMS', 'Parámetro inválido: x, y');
  }
  const tile = `${filter.param(zoom)}::int, ${filter.param(x)}::int, ${filter.param(y)}::int`;
  return { zoom, tile };
}

function sendTile(response: Response, body: Buffer | undefined): void {
  setReadCacheHeader(response);
  if (body === undefined || body.length === 0) {
    response.status(204).end();
    return;
  }
  response.type(TILE_CONTENT_TYPE).send(body);
}

/**
 * `GET /tiles/wells/:z/:x/:y.mvt` (docs/06, ADR 0003): wells as Mapbox Vector Tiles built with
 * ST_AsMVT. A tile has two layers:
 *
 * - `clusters`: points with `pointCount`, only up to CLUSTER_MAX_ZOOM.
 * - `wells`: one point per well with `name`, `slug`, `wellType` and `status`; the feature id is
 *   the well id.
 *
 * It accepts the attribute filters of `GET /wells`, so cluster counts match the filtered list.
 *
 * `GET /tiles/fields/:z/:x/:y.mvt`: field outlines in a `fields` layer with `name`, `slug` and
 * `status`; the feature id is the field id.
 */
export function createTilesRouter(database: Database): Router {
  const router = Router();

  router.get('/tiles/wells/:z/:x/:y.mvt', async (request, response) => {
    const filter = createSqlFilter();
    const { zoom, tile } = tileArguments(filter, request.params);
    const filters = parseParams(wellFilterSchema, request.query);
    const isClustered = zoom <= CLUSTER_MAX_ZOOM;

    // `&&` uses the GiST index on well.geom. Clusters use the exact tile so no well is counted
    // in two tiles; single wells also come from the margin so their symbols are not cut.
    filter.addCondition('w.geom && ST_Transform(bounds.search, 4326)');
    addWellFilters(filter, filters);

    const candidates = `
      bounds AS (
        SELECT ST_TileEnvelope(${tile}) AS geom,
               ST_TileEnvelope(${tile}, margin => ${isClustered ? '0' : String(TILE_BUFFER / TILE_EXTENT)}) AS search
      ),
      candidates AS (
        SELECT w.id, w.name, w.slug, w.well_type, w.status,
               ${WELL_ALERT_LEVEL_SQL} AS alert_level,
               ST_Transform(w.geom, 3857) AS geom
        FROM ${WELL_FILTER_FROM}
        LEFT JOIN well_alert a ON a.well_id = w.id
        CROSS JOIN bounds
        ${filter.where()}
      )`;
    const mvtGeom = (buffer: number): string =>
      `ST_AsMVTGeom(geom, (SELECT geom FROM bounds), ${String(TILE_EXTENT)}, ${String(buffer)}, true) AS geom`;

    const sql = isClustered
      ? `WITH ${candidates},
         grid AS (
           SELECT ST_XMin(geom) AS x_min, ST_YMin(geom) AS y_min,
                  (ST_XMax(geom) - ST_XMin(geom)) / ${String(CLUSTER_GRID_SIZE)} AS cell_m
           FROM bounds
         ),
         cells AS (
           SELECT c.*,
                  floor((ST_X(c.geom) - grid.x_min) / grid.cell_m)::int AS cell_x,
                  floor((ST_Y(c.geom) - grid.y_min) / grid.cell_m)::int AS cell_y
           FROM candidates c CROSS JOIN grid
         ),
         grouped AS (
           -- For a cell with a single well, min() is that well's own value.
           SELECT count(*)::int AS point_count,
                  ST_Centroid(ST_Collect(geom)) AS geom,
                  min(id) AS id, min(name) AS name, min(slug) AS slug,
                  min(well_type) AS well_type, min(status) AS status,
                  CASE
                    WHEN bool_or(alert_level = 'critical') THEN 'critical'
                    WHEN bool_or(alert_level = 'warning') THEN 'warning'
                  END AS alert_level
           FROM cells
           WHERE cell_x BETWEEN 0 AND ${String(CLUSTER_GRID_SIZE - 1)}
             AND cell_y BETWEEN 0 AND ${String(CLUSTER_GRID_SIZE - 1)}
           GROUP BY cell_x, cell_y
         )
         SELECT
           coalesce((
             SELECT ST_AsMVT(layer, 'clusters', ${String(TILE_EXTENT)}, 'geom')
             FROM (SELECT point_count AS "pointCount", alert_level AS "alertLevel", ${mvtGeom(0)}
                   FROM grouped WHERE point_count > 1) layer
           ), '') ||
           coalesce((
             SELECT ST_AsMVT(layer, 'wells', ${String(TILE_EXTENT)}, 'geom', 'id')
             FROM (SELECT ${WELL_PROPERTIES}, ${mvtGeom(0)}
                   FROM grouped WHERE point_count = 1) layer
           ), '') AS tile`
      : `WITH ${candidates}
         SELECT coalesce((
           SELECT ST_AsMVT(layer, 'wells', ${String(TILE_EXTENT)}, 'geom', 'id')
           FROM (SELECT ${WELL_PROPERTIES}, ${mvtGeom(TILE_BUFFER)} FROM candidates) layer
         ), '') AS tile`;

    const { rows } = await database.query<{ tile: Buffer }>(sql, filter.values);
    sendTile(response, rows[0]?.tile);
  });

  // Field outlines as polygons clipped to the tile. ST_AsMVTGeom drops what is smaller than a
  // tile unit, so a low-zoom tile carries only the fields that can be drawn at that scale.
  router.get('/tiles/fields/:z/:x/:y.mvt', async (request, response) => {
    const filter = createSqlFilter();
    const { tile } = tileArguments(filter, request.params);

    const { rows } = await database.query<{ tile: Buffer }>(
      `WITH bounds AS (SELECT ST_TileEnvelope(${tile}) AS geom)
       SELECT ST_AsMVT(layer, 'fields', ${String(TILE_EXTENT)}, 'geom', 'id') AS tile
       FROM (
         SELECT f.id, f.name, f.slug, f.status,
                ST_AsMVTGeom(ST_Transform(f.geom, 3857), bounds.geom,
                             ${String(TILE_EXTENT)}, ${String(TILE_BUFFER)}, true) AS geom
         FROM field f CROSS JOIN bounds
         -- The bounding-box operator uses the GiST index on field.geom.
         WHERE f.geom && ST_Transform(bounds.geom, 4326)
       ) layer
       WHERE geom IS NOT NULL`,
      filter.values,
    );
    sendTile(response, rows[0]?.tile);
  });

  return router;
}
