/** View state in the URL query string (docs/09): filters, open well and map view. */
import {
  wellStatusSchema,
  wellTypeSchema,
  type WellStatus,
  type WellType,
} from '@petroatlas/shared-types';

import { mapConfig } from '@/components/map-config';

import { EMPTY_WELL_FILTERS, type WellFilters } from './well-filters';

export interface MapView {
  lat: number;
  lon: number;
  /** MapLibre zoom, from 0 to 22. */
  zoom: number;
}

export interface MapUrlState {
  filters: WellFilters;
  /** Slug of the open well, or null when the sheet is closed. */
  wellSlug: string | null;
  view: MapView;
}

interface SearchParamsReader {
  get(name: string): string | null;
}

export const DEFAULT_MAP_VIEW: MapView = {
  lat: mapConfig.initialCenter.lat,
  lon: mapConfig.initialCenter.lon,
  zoom: mapConfig.initialZoom,
};

const SPUD_YEAR_PATTERN = /^\d{4}$/;
const WELL_SLUG_PATTERN = /^[A-Za-z0-9._-]{1,200}$/;

function parseSpudYear(value: string | null): string {
  if (value === null || !SPUD_YEAR_PATTERN.test(value)) return '';
  const year = Number(value);
  return year >= 1900 && year <= 2100 ? value : '';
}

function parseStatuses(value: string | null): WellStatus[] {
  const statuses: WellStatus[] = [];
  for (const item of value?.split(',') ?? []) {
    const parsed = wellStatusSchema.safeParse(item);
    if (parsed.success) statuses.push(parsed.data);
  }
  return statuses;
}

function parseTypes(value: string | null): WellType[] {
  const types: WellType[] = [];
  for (const item of value?.split(',') ?? []) {
    const parsed = wellTypeSchema.safeParse(item);
    if (parsed.success) types.push(parsed.data);
  }
  return types;
}

function parseWellSlug(value: string | null): string | null {
  const slug = value?.trim() ?? '';
  return WELL_SLUG_PATTERN.test(slug) ? slug : null;
}

function parseView(value: string | null): MapView {
  const [lat, lon, zoom] = (value ?? '').split(',').map(Number);
  if (
    lat === undefined ||
    lon === undefined ||
    zoom === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    !Number.isFinite(zoom) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180 ||
    zoom < 0 ||
    zoom > 22
  ) {
    return DEFAULT_MAP_VIEW;
  }
  return { lat, lon, zoom };
}

/** Invalid parameters fall back to the defaults without breaking the page (docs/09). */
export function parseMapUrlState(params: SearchParamsReader): MapUrlState {
  return {
    filters: {
      ...EMPTY_WELL_FILTERS,
      field: params.get('campo') ?? '',
      operator: params.get('operadora') ?? '',
      statuses: parseStatuses(params.get('estado')),
      types: parseTypes(params.get('tipo')),
      spudFromYear: parseSpudYear(params.get('perforadoDesde')),
      spudToYear: parseSpudYear(params.get('perforadoHasta')),
    },
    wellSlug: parseWellSlug(params.get('pozo')),
    view: parseView(params.get('vista')),
  };
}

export function toMapSearchParams(state: MapUrlState): URLSearchParams {
  const params = new URLSearchParams();
  const { filters, wellSlug, view } = state;

  if (filters.field !== '') params.set('campo', filters.field);
  if (filters.operator !== '') params.set('operadora', filters.operator);
  if (filters.statuses.length > 0) params.set('estado', filters.statuses.join(','));
  if (filters.types.length > 0) params.set('tipo', filters.types.join(','));
  if (parseSpudYear(filters.spudFromYear) !== '') {
    params.set('perforadoDesde', filters.spudFromYear);
  }
  if (parseSpudYear(filters.spudToYear) !== '') {
    params.set('perforadoHasta', filters.spudToYear);
  }
  if (wellSlug !== null) params.set('pozo', wellSlug);
  params.set('vista', `${view.lat.toFixed(5)},${view.lon.toFixed(5)},${view.zoom.toFixed(2)}`);

  return params;
}

/** Replaces the current history entry: moving the map must not fill the history (docs/09). */
export function writeMapUrlState(state: MapUrlState): void {
  const query = toMapSearchParams(state).toString();
  const path = query === '' ? window.location.pathname : `${window.location.pathname}?${query}`;
  window.history.replaceState(null, '', `${path}${window.location.hash}`);
}
