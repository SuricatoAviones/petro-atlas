import {
  wellCollectionResponseSchema,
  wellCumulativeResponseSchema,
  wellDetailSchema,
  type WellCollectionResponse,
  type WellCumulativeResponse,
  type WellDetail,
} from '@petroatlas/shared-types';
import { Router } from 'express';
import { z } from 'zod';

import type { Database } from '../database.ts';
import { HttpError } from '../http-errors.ts';
import {
  bboxParam,
  idOrSlugParam,
  paginate,
  paginationParams,
  parseParams,
  setReadCacheHeader,
  splitIdOrSlug,
} from '../params.ts';
import { createSqlFilter } from '../sql-filter.ts';
import { WELL_FILTER_FROM, addWellFilters, wellFilterParams } from '../well-filters.ts';

const listQuerySchema = z.object({
  bbox: bboxParam.optional(),
  ...wellFilterParams,
  ...paginationParams,
});

const cumulativeQuerySchema = z.object({
  bbox: bboxParam.optional(),
  ...wellFilterParams,
});

interface WellRow {
  id: number;
  slug: string;
  name: string;
  well_type: string | null;
  status: string;
  field_id: number | null;
  field_name: string | null;
  lon_deg: number;
  lat_deg: number;
  has_daily_data: boolean;
}

interface CumulativeRow {
  id: number;
  name: string;
  lon_deg: number;
  lat_deg: number;
  oil_sm3: number | null;
  gas_sm3: number | null;
  water_sm3: number | null;
}

function addBboxFilter(filter: ReturnType<typeof createSqlFilter>, bbox: unknown): void {
  filter.add((placeholder) => {
    const corner = (index: number): string => `(${placeholder}::float8[])[${String(index)}]`;
    return `w.geom && ST_MakeEnvelope(${corner(1)}, ${corner(2)}, ${corner(3)}, ${corner(4)}, 4326)`;
  }, bbox);
}

interface WellDetailRow {
  id: number;
  slug: string;
  name: string;
  well_type: string | null;
  status: string;
  spud_date: string | null;
  total_depth_m: number | null;
  lon_deg: number;
  lat_deg: number;
  field_id: number | null;
  field_slug: string | null;
  field_name: string | null;
  field_operator: string | null;
  daily_from: string | null;
  daily_to: string | null;
  daily_days: number;
  has_trajectory: boolean;
  log_curves: string[];
  source_name: string;
  source_license: string;
  source_url: string;
}

/** `GET /wells` and `GET /wells/:id` (docs/06). */
export function createWellsRouter(database: Database): Router {
  const router = Router();

  router.get('/wells', async (request, response) => {
    const query = parseParams(listQuerySchema, request.query);

    const filter = createSqlFilter();
    // `&&` on the bounding box uses the GiST index on well.geom.
    filter.add((placeholder) => {
      const corner = (index: number): string => `(${placeholder}::float8[])[${String(index)}]`;
      return `w.geom && ST_MakeEnvelope(${corner(1)}, ${corner(2)}, ${corner(3)}, ${corner(4)}, 4326)`;
    }, query.bbox);
    addWellFilters(filter, query);

    const from = `FROM ${WELL_FILTER_FROM}`;
    // Counted before the cursor is added, so it covers every page.
    const count = await database.query<{ total: number }>(
      `SELECT count(*)::int AS total ${from} ${filter.where()}`,
      [...filter.values],
    );

    filter.add((placeholder) => `w.id > ${placeholder}`, query.cursor);
    const { rows } = await database.query<WellRow>(
      `SELECT w.id, w.slug, w.name, w.well_type, w.status, w.field_id, f.name AS field_name,
              ST_X(w.geom) AS lon_deg, ST_Y(w.geom) AS lat_deg,
              EXISTS (SELECT 1 FROM production_daily p WHERE p.well_id = w.id) AS has_daily_data
       ${from}
       ${filter.where()}
       ORDER BY w.id
       LIMIT ${filter.param(query.limit + 1)}`,
      filter.values,
    );

    const { page, nextCursor } = paginate(rows, query.limit);
    const body: WellCollectionResponse = wellCollectionResponseSchema.parse({
      type: 'FeatureCollection',
      features: page.map((row) => ({
        type: 'Feature',
        id: row.id,
        geometry: { type: 'Point', coordinates: [row.lon_deg, row.lat_deg] },
        properties: {
          name: row.name,
          slug: row.slug,
          wellType: row.well_type,
          status: row.status,
          fieldId: row.field_id,
          fieldName: row.field_name,
          alertLevel: null,
          hasDailyData: row.has_daily_data,
        },
      })),
      totalCount: count.rows[0]?.total ?? 0,
      nextCursor,
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  router.get('/wells/cumulative', async (request, response) => {
    const query = parseParams(cumulativeQuerySchema, request.query);
    const filter = createSqlFilter();
    addBboxFilter(filter, query.bbox);
    addWellFilters(filter, query);

    const { rows } = await database.query<CumulativeRow>(
      `SELECT w.id, w.name, ST_X(w.geom) AS lon_deg, ST_Y(w.geom) AS lat_deg,
              sum(p.oil_sm3)::float8 AS oil_sm3,
              sum(p.gas_sm3)::float8 AS gas_sm3,
              sum(p.water_sm3)::float8 AS water_sm3
       FROM ${WELL_FILTER_FROM}
       LEFT JOIN production_daily p ON p.well_id = w.id
       ${filter.where()}
       GROUP BY w.id, w.name, w.geom
       ORDER BY w.id`,
      filter.values,
    );

    const body: WellCumulativeResponse = wellCumulativeResponseSchema.parse({
      items: rows.map((row) => ({
        wellId: row.id,
        name: row.name,
        lonDeg: row.lon_deg,
        latDeg: row.lat_deg,
        oilSm3: row.oil_sm3,
        gasSm3: row.gas_sm3,
        waterSm3: row.water_sm3,
      })),
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  router.get('/wells/:id', async (request, response) => {
    const reference = parseParams(z.object({ id: idOrSlugParam }), request.params).id;
    const { id, slug } = splitIdOrSlug(reference);

    const { rows } = await database.query<WellDetailRow>(
      `SELECT w.id, w.slug, w.name, w.well_type, w.status,
              w.spud_date::text AS spud_date, w.total_depth_m,
              ST_X(w.geom) AS lon_deg, ST_Y(w.geom) AS lat_deg,
              f.id AS field_id, f.slug AS field_slug, f.name AS field_name,
              f.operator AS field_operator,
              daily.first_date::text AS daily_from, daily.last_date::text AS daily_to,
              daily.days AS daily_days,
              EXISTS (SELECT 1 FROM trajectory_station t WHERE t.well_id = w.id) AS has_trajectory,
              ARRAY(SELECT l.mnemonic FROM log_curve l WHERE l.well_id = w.id ORDER BY l.mnemonic)
                AS log_curves,
              s.name AS source_name, s.license AS source_license, s.url AS source_url
       FROM well w
       JOIN data_source s ON s.id = w.source_id
       LEFT JOIN field f ON f.id = w.field_id
       CROSS JOIN LATERAL (
         SELECT min(p.date) AS first_date, max(p.date) AS last_date, count(*)::int AS days
         FROM production_daily p
         WHERE p.well_id = w.id
       ) daily
       WHERE w.id = $1 OR w.slug = $2
       -- A slug made only of digits wins over another well's id.
       ORDER BY (w.slug = $2) DESC
       LIMIT 1`,
      [id, slug],
    );
    const row = rows[0];
    if (row === undefined) {
      throw new HttpError(404, 'WELL_NOT_FOUND', `No existe el pozo ${reference}`);
    }

    const body: WellDetail = wellDetailSchema.parse({
      id: row.id,
      slug: row.slug,
      name: row.name,
      wellType: row.well_type,
      status: row.status,
      spudDate: row.spud_date,
      totalDepthM: row.total_depth_m,
      location: { lonDeg: row.lon_deg, latDeg: row.lat_deg },
      field:
        row.field_id === null
          ? null
          : {
              id: row.field_id,
              slug: row.field_slug,
              name: row.field_name,
              operator: row.field_operator,
            },
      series: {
        daily:
          row.daily_from === null
            ? null
            : { from: row.daily_from, to: row.daily_to, days: row.daily_days },
        hasTrajectory: row.has_trajectory,
        logCurves: row.log_curves,
      },
      source: { name: row.source_name, license: row.source_license, url: row.source_url },
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  return router;
}
