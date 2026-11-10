/**
 * Production diagnostics (docs/08, "Diagnóstico"). The inputs are daily volumes in SI, as
 * stored in `production_daily`; a missing value is `null` and must stay missing.
 */

type NullableSeries = readonly (number | null)[];

/** Water cut as a fraction: qw / (qo + qw). Null when oil and water are both absent or zero. */
export function waterCut(oilSm3: number | null, waterSm3: number | null): number | null {
  if (oilSm3 === null || waterSm3 === null || oilSm3 < 0 || waterSm3 < 0) return null;
  const totalSm3 = oilSm3 + waterSm3;
  return totalSm3 === 0 ? null : waterSm3 / totalSm3;
}

/** Gas-oil ratio: qg / qo, in SmA3/SmA3. Undefined when the oil volume is zero. */
export function gor(gasSm3: number | null, oilSm3: number | null): number | null {
  if (gasSm3 === null || oilSm3 === null || gasSm3 < 0 || oilSm3 <= 0) return null;
  return gasSm3 / oilSm3;
}

/** Water-oil ratio: qw / qo. Undefined when the oil volume is zero. */
export function waterOilRatio(waterSm3: number | null, oilSm3: number | null): number | null {
  if (waterSm3 === null || oilSm3 === null || waterSm3 < 0 || oilSm3 <= 0) return null;
  return waterSm3 / oilSm3;
}

/** Productivity index J = q / (Pr - Pwf), in volume per day per bar. */
export function productivityIndex(
  rateSm3PerDay: number | null,
  reservoirPressureBar: number | null,
  flowingPressureBar: number | null,
): number | null {
  if (
    rateSm3PerDay === null ||
    reservoirPressureBar === null ||
    flowingPressureBar === null ||
    rateSm3PerDay < 0 ||
    reservoirPressureBar <= flowingPressureBar
  ) {
    return null;
  }
  return rateSm3PerDay / (reservoirPressureBar - flowingPressureBar);
}

function trailingAverage(values: NullableSeries, window: number): (number | null)[] {
  if (!Number.isInteger(window) || window < 1) throw new Error('window must be a positive integer');
  return values.map((_, index) => {
    const sample = values.slice(Math.max(0, index - window + 1), index + 1);
    const present = sample.filter((value): value is number => value !== null);
    return present.length === 0
      ? null
      : present.reduce((sum, value) => sum + value, 0) / present.length;
  });
}

export interface ChanResult {
  /** Water-oil ratio, before smoothing. */
  wor: (number | null)[];
  /** Daily derivative of the trailing moving average of WOR. */
  derivative: (number | null)[];
}

/**
 * Chan diagnostic: water-oil ratio and its derivative over a trailing moving average
 * (docs/08). The derivative is per sample, which is per day for the daily series.
 */
export function chan(waterSm3: NullableSeries, oilSm3: NullableSeries, window = 7): ChanResult {
  const length = Math.min(waterSm3.length, oilSm3.length);
  const wor = Array.from({ length }, (_, index) =>
    waterOilRatio(waterSm3[index] ?? null, oilSm3[index] ?? null),
  );
  const smoothed = trailingAverage(wor, window);
  const derivative = smoothed.map((value, index) => {
    const previous = index === 0 ? null : (smoothed[index - 1] ?? null);
    return value === null || previous === null ? null : value - previous;
  });
  return { wor, derivative };
}
