/** Validation of route and query parameters with Zod (docs/06: an invalid parameter is a 400). */
import type { Response } from 'express';
import { z } from 'zod';

import { HttpError } from './http-errors.ts';

export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 1000;

/** Parses `input` with `schema`, or throws a 400 that names the offending parameters. */
export function parseParams<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? '?')))];
    throw new HttpError(400, 'INVALID_PARAMS', `Parámetro inválido: ${names.join(', ')}`);
  }
  return parsed.data;
}

/**
 * Splits `a,b,c` into its items. Pipe it into an array schema to validate them:
 * `commaSeparated.pipe(z.array(wellStatusSchema).min(1))`.
 */
export const commaSeparated = z.string().transform((value) => value.split(','));

/** Cursor pagination (docs/06): `?limit=100&cursor=...`. The cursor is the last id of a page. */
export const paginationParams = {
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.coerce.number().int().positive().optional(),
};

/** `minLon,minLat,maxLon,maxLat` in EPSG:4326. */
export const bboxParam = z
  .string()
  .transform((value) => value.split(',').map((part) => (part.trim() === '' ? NaN : Number(part))))
  .pipe(
    z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
  )
  .refine(([minLon, minLat, maxLon, maxLat]) => minLon < maxLon && minLat < maxLat);

/** A numeric id or a readable slug, as used in URLs (docs/09). */
export const idOrSlugParam = z.string().min(1).max(200);

/** Splits an id-or-slug reference into the values to compare against each column. */
export function splitIdOrSlug(reference: string): { id: number | null; slug: string } {
  return { id: /^\d{1,9}$/.test(reference) ? Number(reference) : null, slug: reference };
}

/** Splits rows fetched with `limit + 1` into the page and the cursor of the next one. */
export function paginate<Row extends { id: number }>(
  rows: Row[],
  limit: number,
): { page: Row[]; nextCursor: string | null } {
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { page, nextCursor: rows.length > limit && last !== undefined ? String(last.id) : null };
}

/** Read responses are cacheable: data only changes with an ingest (docs/06). */
export function setReadCacheHeader(response: Response): void {
  response.set('Cache-Control', 'public, max-age=300');
}
