/**
 * Data access of the well sheet (docs/09, "Capa de acceso a datos"). The sheet does not know
 * where a well comes from: one repository calls the API and the other reads IndexedDB, and both
 * hand the charts the same `ProductionSeries`.
 */
import type {
  WellDetail,
  WellLogsResponse,
  WellProductionResponse,
  WellTrajectoryResponse,
} from '@petroatlas/shared-types';

import { fetchWellDetail, fetchWellLogs, fetchWellProduction, fetchWellTrajectory } from './api';
import { listImportedWells, type ImportedWell } from './imported-wells';

export type WellOrigin = 'public' | 'imported';

/** A well as the interface refers to it: where it lives and its readable identifier. */
export interface WellKey {
  origin: WellOrigin;
  slug: string;
}

export function wellKeyId(key: WellKey): string {
  return `${key.origin}:${key.slug}`;
}

export function sameWell(left: WellKey, right: WellKey): boolean {
  return left.origin === right.origin && left.slug === right.slug;
}

/** Daily series in columns, in SI. The charts and the engineering tools only see this type. */
export type ProductionSeries = Pick<
  WellProductionResponse,
  'wellId' | 'interval' | 'units' | 'dates' | 'series' | 'source'
>;

export interface WellRepository {
  getDetail(slug: string, signal?: AbortSignal): Promise<WellDetail>;
  getProduction(slug: string, signal?: AbortSignal): Promise<ProductionSeries>;
  getTrajectory(slug: string, signal?: AbortSignal): Promise<WellTrajectoryResponse>;
  getLogs(slug: string, signal?: AbortSignal): Promise<WellLogsResponse>;
}

const apiWellRepository: WellRepository = {
  getDetail: fetchWellDetail,
  getProduction: fetchWellProduction,
  getTrajectory: fetchWellTrajectory,
  getLogs: fetchWellLogs,
};

/** An imported well has no page to link to: the empty URL makes the charts print plain text. */
export const IMPORTED_SOURCE = {
  // The data source is shown in charts, whose label does not depend on the interface language.
  name: 'CSV import / Datos importados',
  license: 'User data / Datos propios; not redistributed',
  url: '',
} as const;

const PRODUCTION_UNITS: ProductionSeries['units'] = {
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
};

/** The stored series as the charts expect it. What the CSV format does not carry stays null. */
export function importedProduction(well: ImportedWell): ProductionSeries {
  const missing = well.dates.map(() => null);
  return {
    wellId: 0,
    interval: 'day',
    units: PRODUCTION_UNITS,
    dates: well.dates,
    series: {
      oil: well.series.oil,
      gas: well.series.gas,
      water: well.series.water,
      waterInj: missing,
      bhp: well.series.bhp,
      whp: well.series.whp,
      bht: missing,
      wht: missing,
      choke: well.series.choke,
      onStream: well.series.onStream,
    },
    source: IMPORTED_SOURCE,
  };
}

/** The CSV format has no type, status, depth or field: those are reported as unknown. */
export function importedDetail(well: ImportedWell): WellDetail {
  const from = well.dates[0];
  const to = well.dates.at(-1);
  return {
    id: 0,
    slug: well.slug,
    name: well.name,
    wellType: null,
    status: 'unknown',
    spudDate: null,
    totalDepthM: null,
    location: { lonDeg: well.lonDeg, latDeg: well.latDeg },
    field: null,
    series: {
      daily: from === undefined || to === undefined ? null : { from, to, days: well.dates.length },
      hasTrajectory: false,
      logCurves: [],
    },
    source: IMPORTED_SOURCE,
  };
}

async function findImportedWell(slug: string): Promise<ImportedWell> {
  const well = (await listImportedWells()).find((candidate) => candidate.slug === slug);
  if (well === undefined) throw new Error(`No imported well ${slug}`);
  return well;
}

const importedWellRepository: WellRepository = {
  getDetail: async (slug) => importedDetail(await findImportedWell(slug)),
  getProduction: async (slug) => importedProduction(await findImportedWell(slug)),
  getTrajectory: async (slug) => {
    await findImportedWell(slug);
    return { wellId: 0, stations: [], source: IMPORTED_SOURCE };
  },
  getLogs: async (slug) => {
    await findImportedWell(slug);
    return { wellId: 0, curves: [], source: IMPORTED_SOURCE };
  },
};

export function repositoryOf(origin: WellOrigin): WellRepository {
  return origin === 'public' ? apiWellRepository : importedWellRepository;
}
