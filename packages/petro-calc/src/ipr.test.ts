import { describe, expect, it } from 'vitest';

import { composite, fetkovich, vogel } from './ipr.ts';

describe('vogel', () => {
  it('matches the worked point: Pr 2000, Pwf 1500, q 400 gives qmax 1000', () => {
    const result = vogel(2000, { pwf: 1500, q: 400 });

    expect(result.qmax).toBeCloseTo(1000, 8);
    const at1000 = result.curve.find((point) => point.pwf === 1000);
    const at0 = result.curve.find((point) => point.pwf === 0);
    expect(at1000?.q).toBeCloseTo(700, 8);
    expect(at0?.q).toBeCloseTo(1000, 8);
  });

  it('rejects impossible test points', () => {
    expect(() => vogel(0, { pwf: 100, q: 10 })).toThrow('Reservoir pressure must be positive');
    expect(() => vogel(2000, { pwf: 2200, q: 10 })).toThrow(
      'Flowing pressure must be between 0 and the reservoir pressure',
    );
    expect(() => vogel(2000, { pwf: 1000, q: -1 })).toThrow('Rate must be non-negative');
  });
});

describe('fetkovich', () => {
  it('recovers C and n from synthetic test points', () => {
    const pr = 3000;
    const c = 0.002;
    const n = 0.9;
    const tests = [1000, 1500, 2000].map((pwf) => ({
      pwf,
      q: c * (pr ** 2 - pwf ** 2) ** n,
    }));
    const result = fetkovich(pr, tests);

    expect(result.c).toBeCloseTo(c, 8);
    expect(result.n).toBeCloseTo(n, 8);
    expect(result.curve.at(-1)?.q).toBeCloseTo(c * (pr ** 2) ** n, 8);
  });

  it('rejects missing or invalid test points', () => {
    expect(() => fetkovich(3000, [{ pwf: 1000, q: 50 }])).toThrow(
      'Fetkovich needs at least two test points',
    );
    expect(() =>
      fetkovich(3000, [
        { pwf: 1000, q: 50 },
        { pwf: 1000, q: 60 },
      ]),
    ).toThrow('The Fetkovich test points must have different flowing pressures');
    expect(() =>
      fetkovich(3000, [
        { pwf: 1000, q: 50 },
        { pwf: 3000, q: 10 },
      ]),
    ).toThrow('Flowing pressure must be between 0 and the reservoir pressure');
  });
});

describe('composite', () => {
  it('joins the linear and Vogel branches', () => {
    const result = composite(3000, 2000, 1);

    expect(result.qb).toBeCloseTo(1000, 8);
    expect(result.qmax).toBeCloseTo(1000 + 2000 / 1.8, 8);
    expect(result.curve.find((point) => point.pwf === 2550)?.q).toBeCloseTo(450, 8);
    expect(result.curve.find((point) => point.pwf === 1500)?.q).toBeCloseTo(
      1000 + (2000 / 1.8) * 0.4,
      8,
    );
    expect(result.curve.at(-1)?.q).toBeCloseTo(result.qmax, 8);
  });

  it('rejects pressures and productivity outside the valid ranges', () => {
    expect(() => composite(3000, 0, 1)).toThrow(
      'Bubble point pressure must be between 0 and the reservoir pressure',
    );
    expect(() => composite(3000, 3001, 1)).toThrow(
      'Bubble point pressure must be between 0 and the reservoir pressure',
    );
    expect(() => composite(3000, 2000, 0)).toThrow('Productivity index must be positive');
  });
});
