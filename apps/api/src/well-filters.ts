/** Attribute filters shared by `GET /wells` and the well tiles, so both show the same wells. */
import { wellStatusSchema, wellTypeSchema } from '@petroatlas/shared-types';
import { z } from 'zod';

import { commaSeparated, idOrSlugParam } from './params.ts';
import type { SqlFilter } from './sql-filter.ts';

export const wellFilterParams = {
  /** Field ids or slugs. */
  field: commaSeparated.pipe(z.array(idOrSlugParam).min(1)).optional(),
  status: commaSeparated.pipe(z.array(wellStatusSchema).min(1)).optional(),
  type: commaSeparated.pipe(z.array(wellTypeSchema).min(1)).optional(),
  /** Operator of the well's field; wells have no operator of their own (docs/10). */
  operator: commaSeparated.pipe(z.array(z.string().min(1)).min(1)).optional(),
  spudFrom: z.iso.date().optional(),
  spudTo: z.iso.date().optional(),
};

export const wellFilterSchema = z.object(wellFilterParams);
type WellFilters = z.output<typeof wellFilterSchema>;

/** The tables the conditions below refer to: `w` is the well and `f` its field, if any. */
export const WELL_FILTER_FROM = 'well w LEFT JOIN field f ON f.id = w.field_id';

export function addWellFilters(filter: SqlFilter, filters: WellFilters): void {
  filter.add(
    (placeholder) => `(f.slug = ANY(${placeholder}) OR f.id::text = ANY(${placeholder}))`,
    filters.field,
  );
  filter.add((placeholder) => `w.status = ANY(${placeholder})`, filters.status);
  filter.add((placeholder) => `w.well_type = ANY(${placeholder})`, filters.type);
  filter.add((placeholder) => `f.operator = ANY(${placeholder})`, filters.operator);
  filter.add((placeholder) => `w.spud_date >= ${placeholder}`, filters.spudFrom);
  filter.add((placeholder) => `w.spud_date <= ${placeholder}`, filters.spudTo);
}
