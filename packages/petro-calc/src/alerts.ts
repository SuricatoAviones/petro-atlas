/**
 * Well alerts over a daily production series (docs/09, "Alertas").
 *
 * The rules and the default thresholds are the ones of the SQL view `well_alert`
 * (db/migrations/0004_well_alert.sql): the view evaluates the public wells on the server and
 * this module evaluates the wells a visitor imports in the browser. Both must agree.
 *
 * Public data is historical, so every rule looks back from the last date of the series, not
 * from today. Volumes are daily volumes in Sm³; a missing value is `null`.
 *
 * @packageDocumentation
 */

type NullableSeries = readonly (number | null)[];

export type AlertKind = 'production_drop' | 'high_water_cut' | 'no_production';
export type AlertLevel = 'warning' | 'critical';

export interface AlertThresholds {
  /** Days of the recent window, counted back from the last date with data. */
  recentDays: number;
  /** Days of the baseline window, right before the recent one. */
  baselineDays: number;
  /** Relative drop of the recent oil rate against the baseline that raises a warning. */
  dropWarningFraction: number;
  /** Relative drop of the recent oil rate against the baseline that raises a critical alert. */
  dropCriticalFraction: number;
  /** Water cut, as a fraction, above which the recent window raises a warning. */
  highWaterCutFraction: number;
  /** Days without oil or gas after which a producer raises a critical alert. */
  noProductionDays: number;
}

/** Thresholds of docs/09; the view `well_alert` uses the same values. */
export const defaultThresholds: Readonly<AlertThresholds> = Object.freeze({
  recentDays: 7,
  baselineDays: 30,
  dropWarningFraction: 0.25,
  dropCriticalFraction: 0.5,
  highWaterCutFraction: 0.8,
  noProductionDays: 3,
});

export interface AlertSeries {
  /** ISO dates (`YYYY-MM-DD`), one per sample, in any order. */
  dates: readonly string[];
  /** Daily oil volume, Sm³. */
  oil: NullableSeries;
  /** Daily gas volume, Sm³. */
  gas: NullableSeries;
  /** Daily water volume, Sm³. */
  water: NullableSeries;
  /**
   * Whether the well is expected to produce: a producer that is not abandoned. An injector or
   * an abandoned well never raises the no-production alert. Defaults to true.
   */
  isActiveProducer?: boolean;
}

export interface AlertIndicators {
  /** Last date of the series; every window is measured from it. */
  asOf: string;
  /** Mean daily oil of the recent window, Sm³/d. Null without oil data in the window. */
  oilRecent: number | null;
  /** Mean daily oil of the baseline window, Sm³/d. Null without oil data in the window. */
  oilBaseline: number | null;
  /** Water cut of the recent window, as a fraction. Null when no liquid was produced. */
  waterCutRecent: number | null;
  /** Oil plus gas volume of the no-production window, Sm³; a missing value counts as zero. */
  productionLastDays: number;
}

export interface Alert {
  kind: AlertKind;
  level: AlertLevel;
  /** Last date of the series, the date the alert refers to. */
  asOf: string;
  /** The figure that raised the alert: oil rate, water cut or produced volume. */
  value: number;
}

const MS_PER_DAY = 86_400_000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(isoDate: string): number {
  if (!ISO_DATE_PATTERN.test(isoDate)) throw new Error(`Invalid ISO date: ${isoDate}`);
  const time = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(time)) throw new Error(`Invalid ISO date: ${isoDate}`);
  return Math.round(time / MS_PER_DAY);
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function assertThresholds(thresholds: AlertThresholds): void {
  const days = [thresholds.recentDays, thresholds.baselineDays, thresholds.noProductionDays];
  if (days.some((value) => !Number.isInteger(value) || value < 1)) {
    throw new Error('Window lengths must be positive integers');
  }
  const fractions = [
    thresholds.dropWarningFraction,
    thresholds.dropCriticalFraction,
    thresholds.highWaterCutFraction,
  ];
  if (fractions.some((value) => !(value > 0 && value < 1))) {
    throw new Error('Fractions must be between 0 and 1');
  }
  if (thresholds.dropWarningFraction > thresholds.dropCriticalFraction) {
    throw new Error('The warning drop must not exceed the critical drop');
  }
}

/**
 * Figures the alert rules compare, measured from the last date of the series.
 *
 * @param series - Daily volumes in Sm³ with their ISO dates.
 * @param thresholds - Window lengths; defaults to {@link defaultThresholds}.
 * @returns The indicators, or null for an empty series.
 */
export function alertIndicators(
  series: AlertSeries,
  thresholds: AlertThresholds = defaultThresholds,
): AlertIndicators | null {
  assertThresholds(thresholds);
  const { dates, oil, gas, water } = series;
  if (oil.length !== dates.length || gas.length !== dates.length || water.length !== dates.length) {
    throw new Error('Every series must have one value per date');
  }
  if (dates.length === 0) return null;

  const days = dates.map(dayNumber);
  let lastIndex = 0;
  days.forEach((day, index) => {
    if (day > (days[lastIndex] ?? day)) lastIndex = index;
  });
  const lastDay = days[lastIndex] ?? 0;
  const asOf = dates[lastIndex] ?? '';

  const recentOil: number[] = [];
  const baselineOil: number[] = [];
  const recentWater: number[] = [];
  const lastProduction: number[] = [];
  days.forEach((day, index) => {
    const age = lastDay - day;
    const oilValue = oil[index] ?? null;
    const gasValue = gas[index] ?? null;
    const waterValue = water[index] ?? null;
    if (age < thresholds.recentDays) {
      if (oilValue !== null) recentOil.push(oilValue);
      if (waterValue !== null) recentWater.push(waterValue);
    } else if (age < thresholds.recentDays + thresholds.baselineDays) {
      if (oilValue !== null) baselineOil.push(oilValue);
    }
    if (age < thresholds.noProductionDays) {
      lastProduction.push((oilValue ?? 0) + (gasValue ?? 0));
    }
  });

  // Like the view: undefined unless both fluids have data in the window and some liquid flowed.
  const liquid = sum(recentOil) + sum(recentWater);
  const waterCutRecent =
    recentWater.length === 0 || recentOil.length === 0 || liquid === 0
      ? null
      : sum(recentWater) / liquid;

  return {
    asOf,
    oilRecent: mean(recentOil),
    oilBaseline: mean(baselineOil),
    waterCutRecent,
    productionLastDays: sum(lastProduction),
  };
}

/**
 * Evaluates the alert rules of docs/09 over a daily series.
 *
 * - Production drop: the mean oil rate of the recent window is at least 25% (warning) or 50%
 *   (critical) below the mean of the baseline window. Not evaluated without baseline data.
 * - High water cut: the water cut of the recent window exceeds 80% (warning).
 * - No production: an active producer with no oil and no gas in the last 3 days (critical).
 *
 * @param series - Daily volumes in Sm³ with their ISO dates.
 * @param thresholds - Thresholds; defaults to {@link defaultThresholds}.
 * @returns The active alerts, critical first. Empty when no rule fires.
 */
export function evaluate(
  series: AlertSeries,
  thresholds: AlertThresholds = defaultThresholds,
): Alert[] {
  const indicators = alertIndicators(series, thresholds);
  if (indicators === null) return [];
  const { asOf, oilRecent, oilBaseline, waterCutRecent, productionLastDays } = indicators;
  const alerts: Alert[] = [];

  if (oilRecent !== null && oilBaseline !== null && oilBaseline > 0) {
    if (oilRecent < (1 - thresholds.dropCriticalFraction) * oilBaseline) {
      alerts.push({ kind: 'production_drop', level: 'critical', asOf, value: oilRecent });
    } else if (oilRecent < (1 - thresholds.dropWarningFraction) * oilBaseline) {
      alerts.push({ kind: 'production_drop', level: 'warning', asOf, value: oilRecent });
    }
  }
  if (waterCutRecent !== null && waterCutRecent > thresholds.highWaterCutFraction) {
    alerts.push({ kind: 'high_water_cut', level: 'warning', asOf, value: waterCutRecent });
  }
  if ((series.isActiveProducer ?? true) && productionLastDays === 0) {
    alerts.push({ kind: 'no_production', level: 'critical', asOf, value: 0 });
  }

  return alerts.sort(
    (left, right) => Number(right.level === 'critical') - Number(left.level === 'critical'),
  );
}
