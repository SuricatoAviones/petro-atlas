/**
 * CSV export of the daily series of a well (docs/06, `GET /wells/:id/export.csv`; RF-12).
 *
 * The columns follow the import format of docs/09, so an exported file can be imported back.
 * Every row carries the source and its licence: the file leaves the application and the
 * attribution must travel with the data (docs/10, "Reglas de licencia").
 */
import { Router } from 'express';
import { z } from 'zod';

import { csvRow } from '../csv.ts';
import type { Database } from '../database.ts';
import { HttpError } from '../http-errors.ts';
import { idOrSlugParam, parseParams, setReadCacheHeader } from '../params.ts';
import { findWell } from '../references.ts';

const exportQuerySchema = z
  .object({ from: z.iso.date().optional(), to: z.iso.date().optional() })
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    path: ['from'],
    message: 'from debe ser anterior o igual a to',
  });

export const EXPORT_COLUMNS = [
  'well',
  'date',
  'lat',
  'lon',
  'oil_sm3',
  'gas_sm3',
  'water_sm3',
  'water_inj_sm3',
  'on_stream_h',
  'bhp_bar',
  'whp_bar',
  'bht_c',
  'wht_c',
  'choke_pct',
  'source',
  'license',
] as const;

interface ExportRow {
  date: string;
  oil_sm3: number | null;
  gas_sm3: number | null;
  water_sm3: number | null;
  water_inj_sm3: number | null;
  on_stream_h: number | null;
  bhp_bar: number | null;
  whp_bar: number | null;
  bht_c: number | null;
  wht_c: number | null;
  choke_pct: number | null;
  source_name: string;
  source_license: string;
}

/** File name without characters that are unsafe in a `Content-Disposition` header. */
function fileNameOf(slug: string): string {
  return `${slug.replaceAll(/[^A-Za-z0-9._-]/g, '_')}.csv`;
}

export function createExportRouter(database: Database): Router {
  const router = Router();

  router.get('/wells/:id/export.csv', async (request, response) => {
    const reference = parseParams(z.object({ id: idOrSlugParam }), request.params).id;
    const query = parseParams(exportQuerySchema, request.query);
    const well = await findWell(database, reference);
    if (well === null) {
      throw new HttpError(404, 'WELL_NOT_FOUND', `No existe el pozo ${reference}`);
    }

    const { rows } = await database.query<ExportRow>(
      `SELECT p.date::text AS date,
              p.oil_sm3, p.gas_sm3, p.water_sm3, p.water_inj_sm3, p.on_stream_h,
              p.bhp_bar, p.whp_bar, p.bht_c, p.wht_c, p.choke_pct,
              s.name AS source_name, s.license AS source_license
       FROM production_daily p
       JOIN data_source s ON s.id = p.source_id
       WHERE p.well_id = $1
         AND ($2::date IS NULL OR p.date >= $2)
         AND ($3::date IS NULL OR p.date <= $3)
       ORDER BY p.date`,
      [well.id, query.from ?? null, query.to ?? null],
    );

    const lines = [csvRow(EXPORT_COLUMNS)];
    for (const row of rows) {
      lines.push(
        csvRow([
          well.name,
          row.date,
          well.latDeg,
          well.lonDeg,
          row.oil_sm3,
          row.gas_sm3,
          row.water_sm3,
          row.water_inj_sm3,
          row.on_stream_h,
          row.bhp_bar,
          row.whp_bar,
          row.bht_c,
          row.wht_c,
          row.choke_pct,
          row.source_name,
          row.source_license,
        ]),
      );
    }

    setReadCacheHeader(response);
    response.set('Content-Type', 'text/csv; charset=utf-8');
    response.set('Content-Disposition', `attachment; filename="${fileNameOf(well.slug)}"`);
    response.send(lines.join(''));
  });

  return router;
}
