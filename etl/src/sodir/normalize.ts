/**
 * Normalization of Sodir FactPages exports (docs/10-fuentes-de-datos.md). Pure functions: rows
 * in, rows for the database and a discard count out.
 *
 * Column names were checked against the real exports on 2026-11-09.
 */
import type { FieldStatus, WellStatus, WellType } from '@petroatlas/shared-types';
import { z } from 'zod';

import type { CsvRecord } from '../csv.ts';

export const WELLBORE_COLUMNS = [
  'wlbWellboreName',
  'wlbPurpose',
  'wlbStatus',
  'wlbEntryDate',
  'wlbField',
  'wlbTotalDepth',
  'wlbNsDecDeg',
  'wlbEwDecDeg',
] as const;

export const FIELD_COLUMNS = [
  'fldName',
  'cmpLongName',
  // The misspelling is Sodir's.
  'fldCurrentActivitySatus',
  'fldNpdidField',
] as const;

type Position = [lonDeg: number, latDeg: number];
type PolygonCoordinates = Position[][];

const positionSchema = z.tuple([z.number(), z.number()]).rest(z.number());
const polygonSchema = z.array(z.array(positionSchema));

/** GeoJSON returned by Sodir's field outline layer, in ED50 (EPSG:4230). */
export const fieldOutlinesSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      properties: z.object({ fldNpdidField: z.number() }),
      geometry: z
        .discriminatedUnion('type', [
          z.object({ type: z.literal('Polygon'), coordinates: polygonSchema }),
          z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygonSchema) }),
        ])
        .nullable(),
    }),
  ),
});
export type FieldOutlines = z.infer<typeof fieldOutlinesSchema>;

export interface NormalizedField {
  name: string;
  operator: string | null;
  status: FieldStatus;
  /** MultiPolygon coordinates in ED50, or null when Sodir publishes no outline. */
  boundaryEd50: PolygonCoordinates[] | null;
}

export interface NormalizedWell {
  name: string;
  wellType: WellType | null;
  status: WellStatus;
  /** ISO date, YYYY-MM-DD. */
  spudDate: string | null;
  totalDepthM: number | null;
  /** Decimal degrees in ED50 (EPSG:4230), as published. The load converts them to WGS 84. */
  lonEd50Deg: number;
  latEd50Deg: number;
  fieldName: string | null;
}

export interface NormalizationReport {
  read: number;
  kept: number;
  /** Discarded rows by reason. */
  discarded: Record<string, number>;
}

function createReport(read: number): NormalizationReport {
  return { read, kept: 0, discarded: {} };
}

function discard(report: NormalizationReport, reason: string): void {
  report.discarded[reason] = (report.discarded[reason] ?? 0) + 1;
}

function textOrNull(value: string | undefined): string | null {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
}

function numberOrNull(value: string | undefined): number | null {
  const text = textOrNull(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Converts Sodir's `DD.MM.YYYY` to ISO; anything else, or an impossible date, is null. */
export function parseSodirDate(value: string | undefined): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value?.trim() ?? '');
  if (match === null) return null;
  const [, day, month, year] = match;
  const isoDate = `${String(year)}-${String(month)}-${String(day)}`;
  const date = new Date(`${isoDate}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(isoDate) ? isoDate : null;
}

const FIELD_STATUS: Record<string, FieldStatus> = {
  Producing: 'producing',
  'Shut down': 'shut_down',
  'Approved for production': 'approved',
};

const DEVELOPMENT_WELL_TYPE: Record<string, WellType> = {
  PRODUCTION: 'producer',
  INJECTION: 'injector',
  'INJECTION-CCS': 'injector',
  OBSERVATION: 'observation',
};

const WELL_STATUS: Record<string, WellStatus> = {
  PRODUCING: 'producing',
  INJECTING: 'injecting',
  CLOSED: 'shut_in',
  SUSPENDED: 'shut_in',
  PLUGGED: 'abandoned',
  'P&A': 'abandoned',
  JUNKED: 'abandoned',
};

function mapWellStatus(sourceStatus: string | null, wellType: WellType | null): WellStatus {
  if (sourceStatus === 'PRODUCING/INJECTING') {
    return wellType === 'injector' ? 'injecting' : 'producing';
  }
  return (sourceStatus === null ? undefined : WELL_STATUS[sourceStatus]) ?? 'unknown';
}

export function normalizeFields(
  records: CsvRecord[],
  outlines: FieldOutlines,
): { fields: NormalizedField[]; report: NormalizationReport } {
  const polygonsByFieldId = new Map<number, PolygonCoordinates[]>();
  for (const { properties, geometry } of outlines.features) {
    if (geometry === null) continue;
    const polygons = polygonsByFieldId.get(properties.fldNpdidField) ?? [];
    const parts = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const part of parts) {
      polygons.push(part.map((ring) => ring.map(([lonDeg, latDeg]): Position => [lonDeg, latDeg])));
    }
    polygonsByFieldId.set(properties.fldNpdidField, polygons);
  }

  const report = createReport(records.length);
  const fields: NormalizedField[] = [];
  const seenNames = new Set<string>();
  for (const record of records) {
    const name = textOrNull(record.fldName);
    if (name === null) {
      discard(report, 'missing_name');
      continue;
    }
    if (seenNames.has(name)) {
      discard(report, 'duplicate_name');
      continue;
    }
    seenNames.add(name);
    const fieldId = numberOrNull(record.fldNpdidField);
    fields.push({
      name,
      operator: textOrNull(record.cmpLongName),
      status: FIELD_STATUS[record.fldCurrentActivitySatus?.trim() ?? ''] ?? 'unknown',
      boundaryEd50: (fieldId === null ? undefined : polygonsByFieldId.get(fieldId)) ?? null,
    });
  }
  report.kept = fields.length;
  return { fields, report };
}

function normalizeWell(
  record: CsvRecord,
  kind: 'exploration' | 'development',
  report: NormalizationReport,
): NormalizedWell | null {
  const name = textOrNull(record.wlbWellboreName);
  if (name === null) {
    discard(report, 'missing_name');
    return null;
  }
  const sourceStatus = textOrNull(record.wlbStatus);
  if (sourceStatus === 'WILL NEVER BE DRILLED') {
    discard(report, 'never_drilled');
    return null;
  }
  const latEd50Deg = numberOrNull(record.wlbNsDecDeg);
  const lonEd50Deg = numberOrNull(record.wlbEwDecDeg);
  if (latEd50Deg === null || lonEd50Deg === null || (latEd50Deg === 0 && lonEd50Deg === 0)) {
    discard(report, 'missing_coordinates');
    return null;
  }
  if (Math.abs(latEd50Deg) > 90 || Math.abs(lonEd50Deg) > 180) {
    discard(report, 'coordinates_out_of_range');
    return null;
  }
  const totalDepthM = numberOrNull(record.wlbTotalDepth);
  const wellType =
    kind === 'exploration'
      ? 'exploration'
      : (DEVELOPMENT_WELL_TYPE[record.wlbPurpose?.trim() ?? ''] ?? null);

  return {
    name,
    wellType,
    status: mapWellStatus(sourceStatus, wellType),
    spudDate: parseSodirDate(record.wlbEntryDate),
    // A negative depth is impossible; keep the well and drop the value.
    totalDepthM: totalDepthM !== null && totalDepthM >= 0 ? totalDepthM : null,
    lonEd50Deg,
    latEd50Deg,
    fieldName: textOrNull(record.wlbField),
  };
}

/**
 * Normalizes exploration and development wellbores. A wellbore reclassified to development is
 * listed in both exports; the development row wins.
 */
export function normalizeWells(
  explorationRecords: CsvRecord[],
  developmentRecords: CsvRecord[],
): { wells: NormalizedWell[]; report: NormalizationReport } {
  const report = createReport(explorationRecords.length + developmentRecords.length);
  const wellsByName = new Map<string, NormalizedWell>();

  const sources = [
    { kind: 'development', records: developmentRecords },
    { kind: 'exploration', records: explorationRecords },
  ] as const;
  for (const { kind, records } of sources) {
    for (const record of records) {
      const well = normalizeWell(record, kind, report);
      if (well === null) continue;
      if (wellsByName.has(well.name)) {
        discard(report, 'duplicate_name');
        continue;
      }
      wellsByName.set(well.name, well);
    }
  }

  const wells = [...wellsByName.values()];
  report.kept = wells.length;
  return { wells, report };
}
