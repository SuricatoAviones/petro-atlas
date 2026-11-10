/**
 * Normalization of the Volve inputs (docs/10, "Volve"): daily production, monthly field
 * production and trajectory stations. Pure functions: rows in, rows for the database and a
 * report of what was discarded and why.
 *
 * The real workbook was inspected on 2026-11-10. Column names and units match docs/10.
 */
export type VolveRecord = Record<string, unknown>;

export interface NormalizedProductionDay {
  wellName: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  oilSm3: number | null;
  gasSm3: number | null;
  waterSm3: number | null;
  waterInjSm3: number | null;
  onStreamH: number | null;
  bhpBar: number | null;
  whpBar: number | null;
  bhtC: number | null;
  whtC: number | null;
  chokePct: number | null;
}

export interface NormalizedMonthlyFieldProduction {
  /** First day of the month, YYYY-MM-01. */
  month: string;
  oilSm3: number;
  gasSm3: number;
  waterSm3: number;
}

export interface NormalizedTrajectoryStation {
  wellName: string;
  mdM: number;
  tvdM: number;
  inclDeg: number | null;
  azimDeg: number | null;
}

export interface RawTrajectoryStation {
  mdM: number | null;
  tvdM: number | null;
  inclDeg: number | null;
  azimDeg: number | null;
}

export interface RawTrajectory {
  fileName: string;
  wellName: string | null;
  /** ISO timestamp when the trajectory ends, used to choose the latest survey. */
  endDate: string | null;
  stations: RawTrajectoryStation[];
}

export interface NormalizationReport {
  read: number;
  kept: number;
  /** Discarded values or rows by reason. A row can add more than one reason. */
  discarded: Record<string, number>;
}

const MS_PER_DAY = 86_400_000;

function createReport(read: number): NormalizationReport {
  return { read, kept: 0, discarded: {} };
}

function discard(report: NormalizationReport, reason: string, count = 1): void {
  report.discarded[reason] = (report.discarded[reason] ?? 0) + count;
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text === '' ? null : text;
}

/** Volve well names in the trajectory files carry a `NO ` prefix; Sodir names do not. */
export function normalizeWellName(value: string | null): string | null {
  const text = value?.trim() ?? '';
  if (text === '') return null;
  return text.replace(/^NO\s+/i, '').trim();
}

/** Converts an Excel serial date to ISO. Handles the Excel 1900 leap-year quirk. */
export function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return null;
  const epoch = serial < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.round(serial * MS_PER_DAY));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') return excelSerialToIsoDate(value);
  const text = textOrNull(value);
  if (text === null || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text) ? text : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text === '' || text.toUpperCase() === 'NULL') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function volume(report: NormalizationReport, value: unknown, reason: string): number | null {
  const parsed = numberOrNull(value);
  if (parsed !== null && parsed < 0) {
    discard(report, reason);
    return null;
  }
  return parsed;
}

function measurement(report: NormalizationReport, value: unknown, reason: string): number | null {
  const parsed = numberOrNull(value);
  if (parsed !== null && parsed < 0) {
    discard(report, reason);
    return null;
  }
  return parsed;
}

/** Normalizes the `Daily Production Data` sheet. Only wells that exist in Sodir are kept. */
export function normalizeProduction(
  records: readonly VolveRecord[],
  knownWells: ReadonlySet<string>,
): { records: NormalizedProductionDay[]; report: NormalizationReport } {
  const report = createReport(records.length);
  const days: NormalizedProductionDay[] = [];

  for (const record of records) {
    const wellName = normalizeWellName(textOrNull(record.NPD_WELL_BORE_NAME));
    const date = toIsoDate(record.DATEPRD);
    if (wellName === null) {
      discard(report, 'missing_well');
      continue;
    }
    if (date === null) {
      discard(report, 'missing_date');
      continue;
    }
    if (!knownWells.has(wellName)) {
      discard(report, 'unknown_well');
      continue;
    }

    let normalizedOnStream = numberOrNull(record.ON_STREAM_HRS);
    if (normalizedOnStream !== null && (normalizedOnStream < 0 || normalizedOnStream > 24)) {
      discard(report, 'on_stream_out_of_range');
      normalizedOnStream = null;
    }

    const day: NormalizedProductionDay = {
      wellName,
      date,
      oilSm3: volume(report, record.BORE_OIL_VOL, 'negative_oil'),
      gasSm3: volume(report, record.BORE_GAS_VOL, 'negative_gas'),
      waterSm3: volume(report, record.BORE_WAT_VOL, 'negative_water'),
      waterInjSm3: volume(report, record.BORE_WI_VOL, 'negative_injection'),
      onStreamH: normalizedOnStream,
      bhpBar: measurement(report, record.AVG_DOWNHOLE_PRESSURE, 'negative_bhp'),
      whpBar: measurement(report, record.AVG_WHP_P, 'negative_whp'),
      bhtC: measurement(report, record.AVG_DOWNHOLE_TEMPERATURE, 'negative_bht'),
      whtC: measurement(report, record.AVG_WHT_P, 'negative_wht'),
      chokePct: measurement(report, record.AVG_CHOKE_SIZE_P, 'negative_choke'),
    };

    const hasMeasurement = [
      day.oilSm3,
      day.gasSm3,
      day.waterSm3,
      day.waterInjSm3,
      day.onStreamH,
      day.bhpBar,
      day.whpBar,
      day.bhtC,
      day.whtC,
      day.chokePct,
    ].some((value) => value !== null);
    if (!hasMeasurement) {
      discard(report, 'no_measurements');
      continue;
    }

    days.push(day);
  }

  report.kept = days.length;
  return { records: days, report };
}

/** Normalizes the `Monthly Production Data` sheet and sums it into one field series. */
export function normalizeMonthlyFieldProduction(
  records: readonly VolveRecord[],
  knownWells: ReadonlySet<string>,
): { records: NormalizedMonthlyFieldProduction[]; report: NormalizationReport } {
  const report = createReport(records.length);
  const months = new Map<string, NormalizedMonthlyFieldProduction>();

  for (const record of records) {
    const wellName = normalizeWellName(textOrNull(record['Wellbore name']));
    const year = numberOrNull(record.Year);
    const month = numberOrNull(record.Month);
    if (wellName === null) {
      discard(report, 'missing_well');
      continue;
    }
    if (!knownWells.has(wellName)) {
      discard(report, 'unknown_well');
      continue;
    }
    if (year === null || !Number.isInteger(year) || year < 1900 || year > 2100) {
      discard(report, 'invalid_year');
      continue;
    }
    if (month === null || !Number.isInteger(month) || month < 1 || month > 12) {
      discard(report, 'invalid_month');
      continue;
    }

    const oilSm3 = numberOrNull(record.Oil);
    const gasSm3 = numberOrNull(record.Gas);
    const waterSm3 = numberOrNull(record.Water);
    if (oilSm3 === null && gasSm3 === null && waterSm3 === null) {
      discard(report, 'no_measurements');
      continue;
    }

    const key = `${String(year)}-${String(month).padStart(2, '0')}`;
    const entry = months.get(key) ?? {
      month: `${key}-01`,
      oilSm3: 0,
      gasSm3: 0,
      waterSm3: 0,
    };
    entry.oilSm3 += oilSm3 ?? 0;
    entry.gasSm3 += gasSm3 ?? 0;
    entry.waterSm3 += waterSm3 ?? 0;
    months.set(key, entry);
  }

  const result = [...months.values()].sort((left, right) => left.month.localeCompare(right.month));
  report.kept = result.length;
  return { records: result, report };
}

function trajectoryIsNewer(left: RawTrajectory, right: RawTrajectory): boolean {
  return (left.endDate ?? '') > (right.endDate ?? '');
}

/** Picks the latest survey per well and drops stations without a usable position. */
export function normalizeTrajectories(
  trajectories: readonly RawTrajectory[],
  knownWells: ReadonlySet<string>,
): { records: NormalizedTrajectoryStation[]; report: NormalizationReport } {
  const report = createReport(
    trajectories.reduce((total, trajectory) => total + trajectory.stations.length, 0),
  );
  const grouped = new Map<string, RawTrajectory[]>();

  for (const trajectory of trajectories) {
    const wellName = normalizeWellName(trajectory.wellName);
    if (wellName === null) {
      discard(report, 'missing_well_name', trajectory.stations.length);
      continue;
    }
    if (!knownWells.has(wellName)) {
      discard(report, 'unknown_well', trajectory.stations.length);
      continue;
    }
    const group = grouped.get(wellName) ?? [];
    group.push(trajectory);
    grouped.set(wellName, group);
  }

  const stations: NormalizedTrajectoryStation[] = [];
  for (const [wellName, group] of grouped) {
    const chosen = group.reduce((best, candidate) =>
      trajectoryIsNewer(candidate, best) ? candidate : best,
    );
    for (const trajectory of group) {
      if (trajectory !== chosen) {
        discard(report, 'duplicate_trajectory', trajectory.stations.length);
      }
    }

    const byDepth = new Map<number, NormalizedTrajectoryStation>();
    for (const station of chosen.stations) {
      if (station.mdM === null || station.tvdM === null) {
        discard(report, 'missing_position');
        continue;
      }
      if (station.mdM < 0 || station.tvdM < 0) {
        discard(report, 'negative_position');
        continue;
      }
      if (byDepth.has(station.mdM)) discard(report, 'duplicate_depth');
      byDepth.set(station.mdM, {
        wellName,
        mdM: station.mdM,
        tvdM: station.tvdM,
        inclDeg:
          station.inclDeg !== null && station.inclDeg >= 0 && station.inclDeg <= 180
            ? station.inclDeg
            : null,
        azimDeg: station.azimDeg === null ? null : ((station.azimDeg % 360) + 360) % 360,
      });
    }
    stations.push(...[...byDepth.values()].sort((left, right) => left.mdM - right.mdM));
  }

  report.kept = stations.length;
  return { records: stations, report };
}
