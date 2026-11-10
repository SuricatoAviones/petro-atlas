/**
 * Production and trajectory series (docs/06). The response is column-oriented to keep the
 * payload small: one array per variable and one date array.
 */
import {
  fieldProductionResponseSchema,
  wellProductionResponseSchema,
  wellTrajectoryResponseSchema,
  type FieldProductionResponse,
  type SourceRef,
  type WellProductionResponse,
  type WellTrajectoryResponse,
} from '@petroatlas/shared-types';
import { Router } from 'express';
import { z } from 'zod';

import type { Database } from '../database.ts';
import { HttpError } from '../http-errors.ts';
import { idOrSlugParam, parseParams, setReadCacheHeader } from '../params.ts';
import { findField, findWell } from '../references.ts';

const rangeSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

const productionQuerySchema = rangeSchema
  .extend({ interval: z.enum(['day', 'month']).default('day') })
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    path: ['from'],
    message: 'from debe ser anterior o igual a to',
  });

const fieldProductionQuerySchema = rangeSchema
  .extend({ interval: z.literal('month').default('month') })
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    path: ['from'],
    message: 'from debe ser anterior o igual a to',
  });

const UNITS = {
  oil: 'Sm3',
  gas: 'Sm3',
  water: 'Sm3',
  waterInj: 'Sm3',
  bhp: 'bar',
  whp: 'bar',
  bht: 'degC',
  wht: 'degC',
  choke: '%',
  onStream: 'h',
} as const;

const FIELD_UNITS = { oil: 'Sm3', gas: 'Sm3', water: 'Sm3' } as const;

interface SourceRow {
  source_name: string;
  source_license: string;
  source_url: string;
}

interface ProductionRow extends SourceRow {
  date: string;
  oil_sm3: number | null;
  gas_sm3: number | null;
  water_sm3: number | null;
  water_inj_sm3: number | null;
  bhp_bar: number | null;
  whp_bar: number | null;
  bht_c: number | null;
  wht_c: number | null;
  choke_pct: number | null;
  on_stream_h: number | null;
}

interface TrajectoryRow extends SourceRow {
  md_m: number;
  tvd_m: number;
  incl_deg: number | null;
  azim_deg: number | null;
}

interface FieldProductionRow extends SourceRow {
  date: string;
  oil_sm3: number | null;
  gas_sm3: number | null;
  water_sm3: number | null;
}

function sourceOf(row: SourceRow | undefined, fallback: SourceRef): SourceRef {
  return row === undefined
    ? fallback
    : { name: row.source_name, license: row.source_license, url: row.source_url };
}

function rangeSql(alias: string, column = 'date'): string {
  return `($2::date IS NULL OR ${alias}.${column} >= $2) AND ($3::date IS NULL OR ${alias}.${column} <= $3)`;
}

const PRODUCTION_COLUMNS = `
  p.date::text AS date,
  p.oil_sm3, p.gas_sm3, p.water_sm3, p.water_inj_sm3, p.on_stream_h,
  p.bhp_bar, p.whp_bar, p.bht_c, p.wht_c, p.choke_pct,
  s.name AS source_name, s.license AS source_license, s.url AS source_url`;

export function createSeriesRouter(database: Database): Router {
  const router = Router();

  router.get('/wells/:id/production', async (request, response) => {
    const reference = parseParams(z.object({ id: idOrSlugParam }), request.params).id;
    const query = parseParams(productionQuerySchema, request.query);
    const well = await findWell(database, reference);
    if (well === null) {
      throw new HttpError(404, 'WELL_NOT_FOUND', `No existe el pozo ${reference}`);
    }

    const params = [well.id, query.from ?? null, query.to ?? null];
    const { rows } =
      query.interval === 'day'
        ? await database.query<ProductionRow>(
            `SELECT ${PRODUCTION_COLUMNS}
             FROM production_daily p
             JOIN data_source s ON s.id = p.source_id
             WHERE p.well_id = $1 AND ${rangeSql('p')}
             ORDER BY p.date`,
            params,
          )
        : await database.query<ProductionRow>(
            `SELECT date_trunc('month', p.date)::date::text AS date,
                    sum(p.oil_sm3)::float8 AS oil_sm3,
                    sum(p.gas_sm3)::float8 AS gas_sm3,
                    sum(p.water_sm3)::float8 AS water_sm3,
                    sum(p.water_inj_sm3)::float8 AS water_inj_sm3,
                    avg(p.bhp_bar)::float8 AS bhp_bar,
                    avg(p.whp_bar)::float8 AS whp_bar,
                    avg(p.bht_c)::float8 AS bht_c,
                    avg(p.wht_c)::float8 AS wht_c,
                    avg(p.choke_pct)::float8 AS choke_pct,
                    avg(p.on_stream_h)::float8 AS on_stream_h,
                    min(s.name) AS source_name,
                    min(s.license) AS source_license,
                    min(s.url) AS source_url
             FROM production_daily p
             JOIN data_source s ON s.id = p.source_id
             WHERE p.well_id = $1 AND ${rangeSql('p')}
             GROUP BY date_trunc('month', p.date)
             ORDER BY 1`,
            params,
          );

    const body: WellProductionResponse = wellProductionResponseSchema.parse({
      wellId: well.id,
      interval: query.interval,
      units: UNITS,
      dates: rows.map((row) => row.date),
      series: {
        oil: rows.map((row) => row.oil_sm3),
        gas: rows.map((row) => row.gas_sm3),
        water: rows.map((row) => row.water_sm3),
        waterInj: rows.map((row) => row.water_inj_sm3),
        bhp: rows.map((row) => row.bhp_bar),
        whp: rows.map((row) => row.whp_bar),
        bht: rows.map((row) => row.bht_c),
        wht: rows.map((row) => row.wht_c),
        choke: rows.map((row) => row.choke_pct),
        onStream: rows.map((row) => row.on_stream_h),
      },
      source: sourceOf(rows[0], well.source),
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  router.get('/wells/:id/trajectory', async (request, response) => {
    const reference = parseParams(z.object({ id: idOrSlugParam }), request.params).id;
    const well = await findWell(database, reference);
    if (well === null) {
      throw new HttpError(404, 'WELL_NOT_FOUND', `No existe el pozo ${reference}`);
    }

    const { rows } = await database.query<TrajectoryRow>(
      `SELECT t.md_m, t.tvd_m, t.incl_deg, t.azim_deg,
              s.name AS source_name, s.license AS source_license, s.url AS source_url
       FROM trajectory_station t
       JOIN data_source s ON s.id = t.source_id
       WHERE t.well_id = $1
       ORDER BY t.md_m`,
      [well.id],
    );

    const body: WellTrajectoryResponse = wellTrajectoryResponseSchema.parse({
      wellId: well.id,
      stations: rows.map((row) => ({
        mdM: row.md_m,
        tvdM: row.tvd_m,
        inclDeg: row.incl_deg,
        azimDeg: row.azim_deg,
      })),
      source: sourceOf(rows[0], well.source),
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  router.get('/fields/:id/production', async (request, response) => {
    const reference = parseParams(z.object({ id: idOrSlugParam }), request.params).id;
    const query = parseParams(fieldProductionQuerySchema, request.query);
    const field = await findField(database, reference);
    if (field === null) {
      throw new HttpError(404, 'FIELD_NOT_FOUND', `No existe el campo ${reference}`);
    }

    const { rows } = await database.query<FieldProductionRow>(
      `SELECT m.month::text AS date, m.oil_sm3, m.gas_sm3, m.water_sm3,
              s.name AS source_name, s.license AS source_license, s.url AS source_url
       FROM field_production_monthly m
       JOIN data_source s ON s.id = m.source_id
       WHERE m.field_id = $1 AND ${rangeSql('m', 'month')}
       ORDER BY m.month`,
      [field.id, query.from ?? null, query.to ?? null],
    );

    const body: FieldProductionResponse = fieldProductionResponseSchema.parse({
      fieldId: field.id,
      interval: 'month',
      units: FIELD_UNITS,
      dates: rows.map((row) => row.date),
      series: {
        oil: rows.map((row) => row.oil_sm3),
        gas: rows.map((row) => row.gas_sm3),
        water: rows.map((row) => row.water_sm3),
      },
      source: sourceOf(rows[0], field.source),
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  return router;
}
