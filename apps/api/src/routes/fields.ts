import {
  fieldDetailSchema,
  fieldListResponseSchema,
  fieldStatusSchema,
  type FieldDetail,
  type FieldListResponse,
} from '@petroatlas/shared-types';
import { Router } from 'express';
import { z } from 'zod';

import type { Database } from '../database.ts';
import { HttpError } from '../http-errors.ts';
import {
  commaSeparated,
  idOrSlugParam,
  paginate,
  paginationParams,
  parseParams,
  setReadCacheHeader,
  splitIdOrSlug,
} from '../params.ts';
import { createSqlFilter } from '../sql-filter.ts';

const listQuerySchema = z.object({
  status: commaSeparated.pipe(z.array(fieldStatusSchema).min(1)).optional(),
  ...paginationParams,
});

interface FieldRow {
  id: number;
  slug: string;
  name: string;
  operator: string | null;
  status: string;
  well_count: number;
}

interface FieldDetailRow extends FieldRow {
  geometry: unknown;
  oil_sm3: number | null;
  gas_sm3: number | null;
  water_sm3: number | null;
  source_name: string;
  source_license: string;
  source_url: string;
}

const FIELD_COLUMNS = `
  f.id, f.slug, f.name, f.operator, f.status,
  (SELECT count(*)::int FROM well w WHERE w.field_id = f.id) AS well_count`;

function toSummary(row: FieldRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    operator: row.operator,
    status: row.status,
    wellCount: row.well_count,
  };
}

/** `GET /fields` and `GET /fields/:id` (docs/06). */
export function createFieldsRouter(database: Database): Router {
  const router = Router();

  router.get('/fields', async (request, response) => {
    const { status, limit, cursor } = parseParams(listQuerySchema, request.query);

    const filter = createSqlFilter();
    filter.add((placeholder) => `f.status = ANY(${placeholder}::text[])`, status);
    filter.add((placeholder) => `f.id > ${placeholder}`, cursor);
    const { rows } = await database.query<FieldRow>(
      `SELECT ${FIELD_COLUMNS}
       FROM field f
       ${filter.where()}
       ORDER BY f.id
       LIMIT ${filter.param(limit + 1)}`,
      filter.values,
    );

    const { page, nextCursor } = paginate(rows, limit);
    const body: FieldListResponse = fieldListResponseSchema.parse({
      items: page.map(toSummary),
      nextCursor,
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  router.get('/fields/:id', async (request, response) => {
    const reference = parseParams(z.object({ id: idOrSlugParam }), request.params).id;
    const { id, slug } = splitIdOrSlug(reference);

    const { rows } = await database.query<FieldDetailRow>(
      `SELECT ${FIELD_COLUMNS},
              ST_AsGeoJSON(f.geom, 6)::json AS geometry,
              totals.oil_sm3, totals.gas_sm3, totals.water_sm3,
              s.name AS source_name, s.license AS source_license, s.url AS source_url
       FROM field f
       JOIN data_source s ON s.id = f.source_id
       CROSS JOIN LATERAL (
         SELECT sum(m.oil_sm3)::float8 AS oil_sm3,
                sum(m.gas_sm3)::float8 AS gas_sm3,
                sum(m.water_sm3)::float8 AS water_sm3
         FROM field_production_monthly m
         WHERE m.field_id = f.id
       ) totals
       WHERE f.id = $1 OR f.slug = $2
       -- A slug made only of digits wins over another field's id.
       ORDER BY (f.slug = $2) DESC
       LIMIT 1`,
      [id, slug],
    );
    const row = rows[0];
    if (row === undefined) {
      throw new HttpError(404, 'FIELD_NOT_FOUND', `No existe el campo ${reference}`);
    }

    const body: FieldDetail = fieldDetailSchema.parse({
      ...toSummary(row),
      geometry: row.geometry,
      totals: { oilSm3: row.oil_sm3, gasSm3: row.gas_sm3, waterSm3: row.water_sm3 },
      source: { name: row.source_name, license: row.source_license, url: row.source_url },
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  return router;
}
