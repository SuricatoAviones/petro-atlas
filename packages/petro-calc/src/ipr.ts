/**
 * Inflow performance relationships (docs/08, "IPR"). Pressures are in bar (or any consistent
 * pressure unit) and rates in volume per day; the curve uses the same units as the inputs.
 *
 * References: Vogel, J.V. (1968), "Inflow Performance Relationships for Solution-Gas Drive
 * Wells", JPT; Fetkovich, M.J. (1973), "The Isochronal Testing of Oil Wells", SPE 4529.
 */

export interface IprPoint {
  pwf: number;
  q: number;
}

export interface VogelResult {
  qmax: number;
  curve: IprPoint[];
}

export interface FetkovichResult {
  c: number;
  n: number;
  curve: IprPoint[];
}

export interface CompositeResult {
  qb: number;
  qmax: number;
  curve: IprPoint[];
}

const CURVE_POINTS = 21;

function curve(qAt: (pwf: number) => number, pr: number): IprPoint[] {
  return Array.from({ length: CURVE_POINTS }, (_, index) => {
    const pwf = pr * (1 - index / (CURVE_POINTS - 1));
    return { pwf, q: qAt(pwf) };
  });
}

function validatePressure(pr: number): void {
  if (!Number.isFinite(pr) || pr <= 0) throw new Error('Reservoir pressure must be positive');
}

/** Vogel IPR from one flowing test point (Pr, Pwf, q). */
export function vogel(pr: number, test: { pwf: number; q: number }): VogelResult {
  validatePressure(pr);
  if (!Number.isFinite(test.pwf) || test.pwf < 0 || test.pwf > pr) {
    throw new Error('Flowing pressure must be between 0 and the reservoir pressure');
  }
  if (!Number.isFinite(test.q) || test.q < 0) throw new Error('Rate must be non-negative');
  const ratio = test.pwf / pr;
  const dimensionless = 1 - 0.2 * ratio - 0.8 * ratio ** 2;
  if (dimensionless <= 0) throw new Error('The test point gives a non-positive Vogel drawdown');
  const qmax = test.q / dimensionless;
  return {
    qmax,
    curve: curve((pwf) => {
      const x = pwf / pr;
      return qmax * (1 - 0.2 * x - 0.8 * x ** 2);
    }, pr),
  };
}

function linearFit(
  x: readonly number[],
  y: readonly number[],
): { slope: number; intercept: number } {
  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (let index = 0; index < n; index += 1) {
    const xi = x[index];
    const yi = y[index];
    if (xi === undefined || yi === undefined) throw new Error('The Fetkovich fit needs two points');
    sumX += xi;
    sumY += yi;
    sumXX += xi * xi;
    sumXY += xi * yi;
  }
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) {
    throw new Error('The Fetkovich test points must have different flowing pressures');
  }
  const slope = (n * sumXY - sumX * sumY) / denominator;
  return { slope, intercept: (sumY - slope * sumX) / n };
}

/** Fetkovich IPR, q = C (Pr² - Pwf²)^n, from at least two test points. */
export function fetkovich(
  pr: number,
  tests: readonly { pwf: number; q: number }[],
): FetkovichResult {
  validatePressure(pr);
  if (tests.length < 2) throw new Error('Fetkovich needs at least two test points');
  const x: number[] = [];
  const y: number[] = [];
  for (const test of tests) {
    if (!Number.isFinite(test.pwf) || test.pwf < 0 || test.pwf >= pr) {
      throw new Error('Flowing pressure must be between 0 and the reservoir pressure');
    }
    if (!Number.isFinite(test.q) || test.q <= 0) {
      throw new Error('Fetkovich test rates must be positive');
    }
    x.push(Math.log(pr ** 2 - test.pwf ** 2));
    y.push(Math.log(test.q));
  }
  const { slope: n, intercept } = linearFit(x, y);
  const c = Math.exp(intercept);
  if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(n) || n <= 0) {
    throw new Error('The Fetkovich fit did not converge');
  }
  return {
    c,
    n,
    curve: curve((pwf) => c * Math.max(0, pr ** 2 - pwf ** 2) ** n, pr),
  };
}

/** Composite IPR: linear above the bubble point and Vogel below it. */
export function composite(pr: number, pb: number, j: number): CompositeResult {
  validatePressure(pr);
  if (!Number.isFinite(pb) || pb <= 0 || pb > pr) {
    throw new Error('Bubble point pressure must be between 0 and the reservoir pressure');
  }
  if (!Number.isFinite(j) || j <= 0) throw new Error('Productivity index must be positive');
  const qb = j * (pr - pb);
  const qmax = qb + (j * pb) / 1.8;
  return {
    qb,
    qmax,
    curve: curve((pwf) => {
      if (pwf >= pb) return j * (pr - pwf);
      const x = pwf / pb;
      return qb + ((j * pb) / 1.8) * (1 - 0.2 * x - 0.8 * x ** 2);
    }, pr),
  };
}
