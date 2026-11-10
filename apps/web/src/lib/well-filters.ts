/** Filter values of the map panel and their serialisation as API query parameters (docs/06). */
import type { WellStatus, WellType } from '@petroatlas/shared-types';

export interface WellFilters {
  /** Slug of the field, or an empty string for every field. */
  field: string;
  /** Operator name, or an empty string for every operator. */
  operator: string;
  statuses: readonly WellStatus[];
  types: readonly WellType[];
  /** Four-digit years; an incomplete value is ignored until it is a valid year. */
  spudFromYear: string;
  spudToYear: string;
}

export const EMPTY_WELL_FILTERS: WellFilters = {
  field: '',
  operator: '',
  statuses: [],
  types: [],
  spudFromYear: '',
  spudToYear: '',
};

const SPUD_YEAR_PATTERN = /^\d{4}$/;

function parseSpudYear(value: string): number | null {
  if (!SPUD_YEAR_PATTERN.test(value)) return null;
  const year = Number(value);
  return year >= 1900 && year <= 2100 ? year : null;
}

/** Query string shared by the count request and the well tiles, so both agree (docs/06). */
export function toWellQuery(filters: WellFilters): string {
  const params = new URLSearchParams();
  if (filters.field !== '') params.set('field', filters.field);
  if (filters.operator !== '') params.set('operator', filters.operator);
  if (filters.statuses.length > 0) params.set('status', filters.statuses.join(','));
  if (filters.types.length > 0) params.set('type', filters.types.join(','));

  const spudFrom = parseSpudYear(filters.spudFromYear);
  if (spudFrom !== null) params.set('spudFrom', `${String(spudFrom)}-01-01`);
  const spudTo = parseSpudYear(filters.spudToYear);
  if (spudTo !== null) params.set('spudTo', `${String(spudTo)}-12-31`);

  return params.toString();
}

export function hasActiveWellFilters(filters: WellFilters): boolean {
  return toWellQuery(filters) !== '';
}
