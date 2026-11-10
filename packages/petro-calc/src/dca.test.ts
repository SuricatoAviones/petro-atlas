import { describe, expect, it } from 'vitest';

import {
  cumulativeAt,
  eur,
  fitArps,
  forecast,
  rateAt,
  type ArpsFit,
  type ArpsModel,
} from './dca.ts';

const DAYS = Array.from({ length: 121 }, (_, day) => day);

function arpsRate(qi: number, di: number, b: number, t: number): number {
  if (b === 0) return qi * Math.exp(-di * t);
  if (b === 1) return qi / (1 + di * t);
  return qi / (1 + b * di * t) ** (1 / b);
}

function series(qi: number, di: number, b: number): { t: number[]; q: number[] } {
  return { t: DAYS, q: DAYS.map((day) => arpsRate(qi, di, b, day)) };
}

function manualFit(qi: number, di: number, b: number, model: ArpsModel): ArpsFit {
  return { model, qi, di, b, r2: 1, n: DAYS.length };
}

describe('fitArps', () => {
  it('recovers an exact exponential decline', () => {
    const { t, q } = series(1000, 0.01, 0);
    const fit = fitArps(t, q, { model: 'exponential' });

    expect(fit.model).toBe('exponential');
    expect(fit.b).toBe(0);
    expect(fit.qi).toBeCloseTo(1000, 8);
    expect(fit.di).toBeCloseTo(0.01, 8);
    expect(fit.r2).toBeCloseTo(1, 10);
    expect(fit.n).toBe(DAYS.length);
  });

  it('recovers an exact harmonic decline', () => {
    const { t, q } = series(1000, 0.01, 1);
    const fit = fitArps(t, q, { model: 'harmonic' });

    expect(fit.model).toBe('harmonic');
    expect(fit.b).toBeCloseTo(1, 10);
    expect(fit.qi).toBeCloseTo(1000, 6);
    expect(fit.di).toBeCloseTo(0.01, 6);
    expect(fit.r2).toBeCloseTo(1, 10);
  });

  it('recovers a hyperbolic decline and selects it with auto', () => {
    const { t, q } = series(1000, 0.02, 0.5);
    const fit = fitArps(t, q);

    expect(fit.model).toBe('hyperbolic');
    expect(fit.b).toBeCloseTo(0.5, 3);
    expect(fit.qi).toBeCloseTo(1000, 3);
    expect(fit.di).toBeCloseTo(0.02, 4);
    expect(fit.r2).toBeCloseTo(1, 6);
  });

  it('ignores closed and non-positive rates', () => {
    const { t, q } = series(1000, 0.01, 0);
    const withGaps = { t: [...t, 121, 122], q: [...q, 0, -5] };
    const fit = fitArps(withGaps.t, withGaps.q, { model: 'exponential' });

    expect(fit.n).toBe(DAYS.length);
    expect(fit.qi).toBeCloseTo(1000, 6);
  });

  it('requires at least six positive points', () => {
    expect(() => fitArps([0, 1, 2, 3, 4], [100, 90, 80, 70, 60])).toThrow(
      'At least 6 positive rate points are required',
    );
  });

  it('rejects mismatched arrays and an invalid bMax', () => {
    expect(() => fitArps([0, 1], [100])).toThrow('t and q must have the same length');
    expect(() =>
      fitArps(
        DAYS,
        DAYS.map(() => 10),
        { bMax: 1.2 },
      ),
    ).toThrow('bMax must be between 0 and 1');
  });
});

describe('rateAt and cumulativeAt', () => {
  it('evaluates the exponential, harmonic and hyperbolic equations', () => {
    const exponential = manualFit(100, 0.01, 0, 'exponential');
    const harmonic = manualFit(100, 0.01, 1, 'harmonic');
    const hyperbolic = manualFit(1000, 0.02, 0.5, 'hyperbolic');

    expect(rateAt(exponential, 10)).toBeCloseTo(90.4837418, 6);
    expect(rateAt(harmonic, 10)).toBeCloseTo(90.9090909, 6);
    expect(rateAt(hyperbolic, 30)).toBeCloseTo(591.7159763, 6);
  });

  it('integrates the exponential and harmonic rates analytically', () => {
    const exponential = manualFit(100, 0.01, 0, 'exponential');
    const harmonic = manualFit(100, 0.01, 1, 'harmonic');

    expect(cumulativeAt(exponential, 10)).toBeCloseTo(951.6258196, 6);
    expect(cumulativeAt(harmonic, 10)).toBeCloseTo(953.1017980, 6);
  });

  it('matches a numerical integral for the hyperbolic equation', () => {
    const fit = manualFit(1000, 0.02, 0.5, 'hyperbolic');
    const steps = 10_000;
    const dt = 30 / steps;
    let numerical = 0;
    for (let index = 0; index < steps; index += 1) {
      numerical += rateAt(fit, (index + 0.5) * dt) * dt;
    }

    expect(cumulativeAt(fit, 30)).toBeCloseTo(numerical, 2);
  });

  it('returns zero cumulative at the start and handles a constant rate', () => {
    const exponential = manualFit(100, 0.01, 0, 'exponential');
    const constant = manualFit(50, 0, 0.5, 'hyperbolic');

    expect(cumulativeAt(exponential, 0)).toBe(0);
    expect(cumulativeAt(constant, 10)).toBe(500);
    expect(rateAt(constant, 10)).toBe(50);
  });

  it('rejects negative times', () => {
    const fit = manualFit(100, 0.01, 0, 'exponential');
    expect(() => rateAt(fit, -1)).toThrow('t must be a non-negative number of days');
    expect(() => cumulativeAt(fit, -1)).toThrow('t must be a non-negative number of days');
  });
});

describe('forecast', () => {
  it('includes the final day when the step does not divide it', () => {
    const fit = manualFit(100, 0.01, 0, 'exponential');
    const result = forecast(fit, 2.5, 1);

    expect(result.t).toEqual([0, 1, 2, 2.5]);
    expect(result.q).toHaveLength(4);
    expect(result.q[0]).toBeCloseTo(100, 10);
    expect(result.q.at(-1)).toBeCloseTo(rateAt(fit, 2.5), 10);
  });

  it('rejects invalid ranges', () => {
    const fit = manualFit(100, 0.01, 0, 'exponential');
    expect(() => forecast(fit, -1)).toThrow('days must be a non-negative number');
    expect(() => forecast(fit, 10, 0)).toThrow('step must be positive');
  });
});

describe('eur', () => {
  it('adds the cumulative before the fitted window', () => {
    const fit = manualFit(1000, 0.01, 0, 'exponential');
    expect(eur(fit, 10, 5000)).toBeCloseTo(104000, 4);
  });

  it('uses the harmonic limit time', () => {
    const fit = manualFit(100, 0.01, 1, 'harmonic');
    expect(eur(fit, 10, 0)).toBeCloseTo((100 / 0.01) * Math.log(10), 6);
  });

  it('returns the initial cumulative when the rate is already below the limit', () => {
    const fit = manualFit(100, 0.01, 0, 'exponential');
    expect(eur(fit, 200, 1234)).toBe(1234);
  });

  it('returns infinity for a constant rate above the limit', () => {
    const fit = manualFit(100, 0, 0.5, 'hyperbolic');
    expect(eur(fit, 10, 0)).toBe(Infinity);
  });

  it('rejects invalid limits and starting volumes', () => {
    const fit = manualFit(100, 0.01, 0, 'exponential');
    expect(() => eur(fit, 0, 0)).toThrow('qLimit must be positive');
    expect(() => eur(fit, 10, -1)).toThrow('cumulativeToWindowStart must be non-negative');
  });
});
