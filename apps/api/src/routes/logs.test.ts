import { describe, expect, it } from 'vitest';

import { cropCurve } from './logs.ts';

/** Eleven samples from 1000 m to 1010 m, one per metre; the value is the depth offset. */
const curve = {
  mnemonic: 'GR',
  unit: 'gAPI',
  top_m: 1000,
  base_m: 1010,
  samples: [0, 1, 2, 3, 4, null, 6, 7, 8, 9, 10],
};

describe('cropCurve', () => {
  it('returns the whole curve without a window', () => {
    expect(cropCurve(curve, undefined, undefined)).toEqual({
      mnemonic: 'GR',
      unit: 'gAPI',
      topM: 1000,
      baseM: 1010,
      stepM: 1,
      values: curve.samples,
    });
  });

  it('keeps the samples inside the window, limits included', () => {
    const cropped = cropCurve(curve, 1002, 1006);
    expect(cropped?.topM).toBe(1002);
    expect(cropped?.baseM).toBe(1006);
    expect(cropped?.values).toEqual([2, 3, 4, null, 6]);
  });

  it('snaps a window between samples to the samples it contains', () => {
    const cropped = cropCurve(curve, 1002.4, 1005.6);
    expect(cropped?.topM).toBe(1003);
    expect(cropped?.baseM).toBe(1005);
    expect(cropped?.values).toEqual([3, 4, null]);
  });

  it('accepts a window that only limits one side', () => {
    expect(cropCurve(curve, 1008, undefined)?.values).toEqual([8, 9, 10]);
    expect(cropCurve(curve, undefined, 1001)?.values).toEqual([0, 1]);
  });

  it('returns null when the window does not touch the curve', () => {
    expect(cropCurve(curve, 0, 999)).toBeNull();
    expect(cropCurve(curve, 1011, 2000)).toBeNull();
    expect(cropCurve(curve, 1002.2, 1002.8)).toBeNull();
    expect(cropCurve({ ...curve, samples: [] }, undefined, undefined)).toBeNull();
  });

  it('handles a curve with a single sample', () => {
    const single = { ...curve, base_m: 1000, samples: [42] };
    expect(cropCurve(single, undefined, undefined)).toMatchObject({ stepM: 0, values: [42] });
    expect(cropCurve(single, 900, 1100)?.values).toEqual([42]);
    expect(cropCurve(single, 1001, 1100)).toBeNull();
    expect(cropCurve(single, 0, 999)).toBeNull();
  });
});
