import { describe, expect, it } from 'vitest';

import { chan, gor, productivityIndex, waterCut, waterOilRatio } from './diagnostics.ts';

describe('waterCut', () => {
  it('returns the water fraction', () => {
    expect(waterCut(50, 50)).toBeCloseTo(0.5, 10);
    expect(waterCut(75, 25)).toBeCloseTo(0.25, 10);
  });

  it('returns 1 when only water is produced', () => {
    expect(waterCut(0, 10)).toBe(1);
  });

  it('returns null for missing values and for a zero total', () => {
    expect(waterCut(null, 10)).toBeNull();
    expect(waterCut(10, null)).toBeNull();
    expect(waterCut(0, 0)).toBeNull();
  });
});

describe('gor and waterOilRatio', () => {
  it('returns the ratios', () => {
    expect(gor(200, 100)).toBe(2);
    expect(waterOilRatio(30, 100)).toBeCloseTo(0.3, 10);
  });

  it('returns null when oil is zero or missing', () => {
    expect(gor(200, 0)).toBeNull();
    expect(waterOilRatio(30, 0)).toBeNull();
    expect(gor(null, 100)).toBeNull();
    expect(waterOilRatio(30, null)).toBeNull();
  });
});

describe('productivityIndex', () => {
  it('returns q / (Pr - Pwf)', () => {
    expect(productivityIndex(100, 200, 150)).toBe(2);
  });

  it('returns null when the drawdown is not positive', () => {
    expect(productivityIndex(100, 150, 150)).toBeNull();
    expect(productivityIndex(100, 140, 150)).toBeNull();
    expect(productivityIndex(null, 200, 150)).toBeNull();
  });
});

describe('chan', () => {
  it('smooths WOR with a trailing window and differentiates it', () => {
    const result = chan([0, 0, 1, 2, 3], [10, 10, 10, 10, 10], 2);

    expect(result.wor).toEqual([0, 0, 0.1, 0.2, 0.3]);
    expect(result.derivative[0]).toBeNull();
    expect(result.derivative[1]).toBeCloseTo(0, 10);
    expect(result.derivative[2]).toBeCloseTo(0.05, 10);
    expect(result.derivative[3]).toBeCloseTo(0.1, 10);
    expect(result.derivative[4]).toBeCloseTo(0.1, 10);
  });

  it('keeps a gap where the ratio is undefined', () => {
    const result = chan([1, null, 2], [10, 10, 0], 2);

    expect(result.wor).toEqual([0.1, null, null]);
    expect(result.derivative[0]).toBeNull();
    expect(result.derivative[1]).toBeCloseTo(0, 10);
    expect(result.derivative[2]).toBeNull();
  });

  it('rejects a non-positive window', () => {
    expect(() => chan([1], [1], 0)).toThrow('window must be a positive integer');
  });
});
