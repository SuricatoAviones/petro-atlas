/**
 * Well log curves (docs/06, `GET /wells/:id/logs`). A curve is stored as one array of samples
 * at a constant depth step between its top and its base (docs/05), so cropping to a depth
 * window is a slice of that array.
 */
import {
  wellLogsResponseSchema,
  type LogCurve,
  type WellLogsResponse,
} from '@petroatlas/shared-types';
import { Router } from 'express';
import { z } from 'zod';

import type { Database } from '../database.ts';
import { HttpError } from '../http-errors.ts';
import { commaSeparated, idOrSlugParam, parseParams, setReadCacheHeader } from '../params.ts';
import { findWell } from '../references.ts';

const depthParam = z.coerce.number().min(0).max(20_000);

const logsQuerySchema = z
  .object({
    /** Mnemonics to return, such as `GR,RHOB`; every curve when absent. */
    curves: commaSeparated
      .pipe(z.array(z.string().trim().min(1).max(32)).min(1).max(50))
      .optional(),
    /** Depth window in metres of measured depth. */
    top: depthParam.optional(),
    base: depthParam.optional(),
  })
  .refine(
    (query) => query.top === undefined || query.base === undefined || query.top <= query.base,
    {
      path: ['top'],
      message: 'top debe ser menor o igual que base',
    },
  );

interface LogCurveRow {
  mnemonic: string;
  unit: string | null;
  top_m: number;
  base_m: number;
  samples: (number | null)[];
  source_name: string;
  source_license: string;
  source_url: string;
}

/**
 * Keeps the samples whose depth falls inside `[top, base]`. Returns null when the window does
 * not touch the curve, so the response only lists curves with data to draw.
 */
export function cropCurve(
  row: Pick<LogCurveRow, 'mnemonic' | 'unit' | 'top_m' | 'base_m' | 'samples'>,
  top: number | undefined,
  base: number | undefined,
): LogCurve | null {
  const stepM = row.samples.length > 1 ? (row.base_m - row.top_m) / (row.samples.length - 1) : 0;
  const lastIndex = row.samples.length - 1;
  if (lastIndex < 0) return null;

  let first = 0;
  let last = lastIndex;
  if (stepM > 0) {
    // The small tolerance keeps a sample that sits exactly on the limit despite float rounding.
    if (top !== undefined) first = Math.max(0, Math.ceil((top - row.top_m) / stepM - 1e-9));
    if (base !== undefined) {
      last = Math.min(lastIndex, Math.floor((base - row.top_m) / stepM + 1e-9));
    }
  } else if ((top !== undefined && row.top_m < top) || (base !== undefined && row.top_m > base)) {
    return null;
  }
  if (first > last) return null;

  return {
    mnemonic: row.mnemonic,
    unit: row.unit,
    topM: row.top_m + first * stepM,
    baseM: row.top_m + last * stepM,
    stepM,
    values: row.samples.slice(first, last + 1),
  };
}

export function createLogsRouter(database: Database): Router {
  const router = Router();

  router.get('/wells/:id/logs', async (request, response) => {
    const reference = parseParams(z.object({ id: idOrSlugParam }), request.params).id;
    const query = parseParams(logsQuerySchema, request.query);
    const well = await findWell(database, reference);
    if (well === null) {
      throw new HttpError(404, 'WELL_NOT_FOUND', `No existe el pozo ${reference}`);
    }

    const mnemonics = query.curves?.map((mnemonic) => mnemonic.toUpperCase()) ?? null;
    const { rows } = await database.query<LogCurveRow>(
      `SELECT l.mnemonic, l.unit, l.top_m, l.base_m, l.samples,
              s.name AS source_name, s.license AS source_license, s.url AS source_url
       FROM log_curve l
       JOIN data_source s ON s.id = l.source_id
       WHERE l.well_id = $1 AND ($2::text[] IS NULL OR upper(l.mnemonic) = ANY($2))
       ORDER BY l.mnemonic`,
      [well.id, mnemonics],
    );

    const first = rows[0];
    const body: WellLogsResponse = wellLogsResponseSchema.parse({
      wellId: well.id,
      curves: rows.flatMap((row) => cropCurve(row, query.top, query.base) ?? []),
      source:
        first === undefined
          ? well.source
          : { name: first.source_name, license: first.source_license, url: first.source_url },
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  return router;
}
