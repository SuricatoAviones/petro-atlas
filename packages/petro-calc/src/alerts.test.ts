import { describe, expect, it } from 'vitest';

import {
  alertIndicators,
  defaultThresholds,
  evaluate,
  type AlertSeries,
  type AlertThresholds,
} from './alerts.ts';

const START = Date.UTC(2026, 0, 1);

function isoDate(dayIndex: number): string {
  return new Date(START + dayIndex * 86_400_000).toISOString().slice(0, 10);
}

/** A daily series whose values come from a function of the day index. */
function seriesOf(
  days: number,
  value: (day: number) => { oil: number | null; gas?: number | null; water?: number | null },
  extra: Partial<AlertSeries> = {},
): AlertSeries {
  const samples = Array.from({ length: days }, (_, day) => value(day));
  return {
    dates: samples.map((_, day) => isoDate(day)),
    oil: samples.map((sample) => sample.oil),
    gas: samples.map((sample) => sample.gas ?? null),
    water: samples.map((sample) => sample.water ?? null),
    ...extra,
  };
}

/** 40 days: 100 Sm³/d for the first 33 and `recentOil` for the last 7. */
function withRecentOil(recentOil: number, water = 10): AlertSeries {
  return seriesOf(40, (day) => ({ oil: day < 33 ? 100 : recentOil, gas: 1000, water }));
}

describe('defaultThresholds', () => {
  it('holds the values of docs/09, shared with the well_alert view', () => {
    expect(defaultThresholds).toEqual({
      recentDays: 7,
      baselineDays: 30,
      dropWarningFraction: 0.25,
      dropCriticalFraction: 0.5,
      highWaterCutFraction: 0.8,
      noProductionDays: 3,
    });
    expect(Object.isFrozen(defaultThresholds)).toBe(true);
  });
});

describe('alertIndicators', () => {
  it('measures every window from the last date of the series', () => {
    const indicators = alertIndicators(withRecentOil(60, 40));
    expect(indicators).not.toBeNull();
    expect(indicators?.asOf).toBe(isoDate(39));
    expect(indicators?.oilRecent).toBeCloseTo(60, 10);
    expect(indicators?.oilBaseline).toBeCloseTo(100, 10);
    expect(indicators?.waterCutRecent).toBeCloseTo(40 / 100, 10);
    expect(indicators?.productionLastDays).toBeCloseTo(3 * 1060, 10);
  });

  it('only averages the baseline over its own 30 days', () => {
    // 50 days: the first 13 fall outside both windows and must be ignored.
    const series = seriesOf(50, (day) => ({ oil: day < 13 ? 900 : day < 43 ? 100 : 80 }));
    const indicators = alertIndicators(series);
    expect(indicators?.oilBaseline).toBeCloseTo(100, 10);
    expect(indicators?.oilRecent).toBeCloseTo(80, 10);
  });

  it('accepts dates in any order', () => {
    const ordered = withRecentOil(40);
    const reversed: AlertSeries = {
      dates: [...ordered.dates].reverse(),
      oil: [...ordered.oil].reverse(),
      gas: [...ordered.gas].reverse(),
      water: [...ordered.water].reverse(),
    };
    expect(alertIndicators(reversed)).toEqual(alertIndicators(ordered));
  });

  it('keeps missing values missing', () => {
    const indicators = alertIndicators(seriesOf(40, () => ({ oil: null })));
    expect(indicators?.oilRecent).toBeNull();
    expect(indicators?.oilBaseline).toBeNull();
    expect(indicators?.waterCutRecent).toBeNull();
    expect(indicators?.productionLastDays).toBe(0);
  });

  it('leaves the water cut undefined when no liquid flowed', () => {
    const indicators = alertIndicators(seriesOf(10, () => ({ oil: 0, water: 0 })));
    expect(indicators?.waterCutRecent).toBeNull();
  });

  it('returns null for an empty series', () => {
    expect(alertIndicators({ dates: [], oil: [], gas: [], water: [] })).toBeNull();
  });

  it('rejects series of different lengths and invalid dates', () => {
    expect(() => alertIndicators({ dates: [isoDate(0)], oil: [], gas: [1], water: [1] })).toThrow(
      /one value per date/,
    );
    expect(() =>
      alertIndicators({ dates: ['01/02/2026'], oil: [1], gas: [1], water: [1] }),
    ).toThrow(/Invalid ISO date/);
    expect(() =>
      alertIndicators({ dates: ['2026-13-45'], oil: [1], gas: [1], water: [1] }),
    ).toThrow(/Invalid ISO date/);
  });

  it('rejects invalid thresholds', () => {
    const series = withRecentOil(100);
    const invalid: Partial<AlertThresholds>[] = [
      { recentDays: 0 },
      { baselineDays: 1.5 },
      { highWaterCutFraction: 1 },
      { dropWarningFraction: 0 },
      { dropWarningFraction: 0.6, dropCriticalFraction: 0.5 },
    ];
    for (const override of invalid) {
      expect(() => alertIndicators(series, { ...defaultThresholds, ...override })).toThrow();
    }
  });
});

describe('evaluate', () => {
  it('raises no alert for a steady producer', () => {
    expect(evaluate(withRecentOil(100))).toEqual([]);
    // A 20% drop stays below the warning threshold.
    expect(evaluate(withRecentOil(80))).toEqual([]);
  });

  it('raises a warning when oil drops at least 25% against the previous 30 days', () => {
    const alerts = evaluate(withRecentOil(70));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: 'production_drop',
      level: 'warning',
      asOf: isoDate(39),
    });
    expect(alerts[0]?.value).toBeCloseTo(70, 10);
  });

  it('raises a critical alert when oil drops at least 50%', () => {
    const alerts = evaluate(withRecentOil(40));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ kind: 'production_drop', level: 'critical' });
  });

  it('does not evaluate the drop without the 30 previous days', () => {
    const shortSeries = seriesOf(7, () => ({ oil: 1, gas: 1, water: 0 }));
    expect(evaluate(shortSeries)).toEqual([]);
    // A baseline of zero has no drop to measure either.
    const fromZero = seriesOf(40, (day) => ({ oil: day < 33 ? 0 : 5, gas: 1 }));
    expect(evaluate(fromZero)).toEqual([]);
  });

  it('raises a warning when the water cut of the last 7 days exceeds 80%', () => {
    const alerts = evaluate(withRecentOil(100, 900));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ kind: 'high_water_cut', level: 'warning' });
    expect(alerts[0]?.value).toBeCloseTo(0.9, 10);
    // Exactly 80% is not above the threshold.
    expect(evaluate(withRecentOil(100, 400))).toEqual([]);
  });

  it('raises a critical alert for a producer with no oil or gas for 3 days', () => {
    // Seven days only, so there is no baseline and the drop rule stays out of the way.
    const series = seriesOf(7, (day) => ({ oil: day < 4 ? 50 : 0, gas: day < 4 ? 500 : 0 }));
    expect(evaluate(series)).toEqual([
      { kind: 'no_production', level: 'critical', asOf: isoDate(6), value: 0 },
    ]);
  });

  it('does not raise the no-production alert for an injector or an abandoned well', () => {
    const series = seriesOf(10, () => ({ oil: null }), { isActiveProducer: false });
    expect(evaluate(series)).toEqual([]);
  });

  it('does not raise the no-production alert while gas still flows', () => {
    const series = seriesOf(10, () => ({ oil: 0, gas: 100 }));
    expect(evaluate(series)).toEqual([]);
  });

  it('lists critical alerts first when several rules fire', () => {
    // High water cut (warning) and a critical drop at once.
    const series = seriesOf(40, (day) => ({
      oil: day < 33 ? 100 : 10,
      gas: 100,
      water: day < 33 ? 10 : 200,
    }));
    expect(evaluate(series).map((alert) => [alert.kind, alert.level])).toEqual([
      ['production_drop', 'critical'],
      ['high_water_cut', 'warning'],
    ]);
  });

  it('honours custom thresholds', () => {
    const strict: AlertThresholds = { ...defaultThresholds, dropWarningFraction: 0.1 };
    expect(evaluate(withRecentOil(85), strict)).toHaveLength(1);
    expect(evaluate(withRecentOil(85))).toEqual([]);
  });

  it('returns no alert for an empty series', () => {
    expect(evaluate({ dates: [], oil: [], gas: [], water: [] })).toEqual([]);
  });
});
