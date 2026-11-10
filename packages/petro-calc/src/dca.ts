/**
 * Arps decline curves (docs/08, "Declinación de Arps"). Times are days; rates use any consistent
 * unit and the returned `qi` is in that same unit. The fit profiles the hyperbolic exponent `b`
 * and solves `qi` and `di` by linear least squares for each `b`, which is a stable way to obtain
 * the nonlinear least-squares solution without external dependencies.
 *
 * References: Arps, J.J. (1945), "Analysis of Decline Curves", Transactions of the AIME.
 * Ahmed, T. (2010), Reservoir Engineering Handbook, chapter on decline curves.
 */

export type ArpsModel = 'exponential' | 'hyperbolic' | 'harmonic';

export interface ArpsFit {
  model: ArpsModel;
  /** Initial rate at t = 0, in the rate unit passed to `fitArps`. */
  qi: number;
  /** Initial nominal decline, 1/day. */
  di: number;
  /** Hyperbolic exponent: 0 exponential, 1 harmonic, otherwise between. */
  b: number;
  /** Coefficient of determination of the log-rate fit, from 0 to 1. */
  r2: number;
  /** Number of positive-rate points used. */
  n: number;
}

export interface ArpsFitOptions {
  model?: ArpsModel | 'auto';
  /** Upper bound for b in auto/hyperbolic fits. Defaults to 1. */
  bMax?: number;
}

const B_EPSILON = 1e-6;
const MIN_POINTS = 6;
const B_GRID_STEPS = 2001;

function linearFit(
  x: readonly number[],
  y: readonly number[],
): { slope: number; intercept: number; sse: number } | null {
  const n = x.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (let index = 0; index < n; index += 1) {
    const xi = x[index];
    const yi = y[index];
    if (xi === undefined || yi === undefined) return null;
    sumX += xi;
    sumY += yi;
    sumXX += xi * xi;
    sumXY += xi * yi;
  }
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  let sse = 0;
  for (let index = 0; index < n; index += 1) {
    const xi = x[index];
    const yi = y[index];
    if (xi === undefined || yi === undefined) return null;
    const residual = yi - (slope * xi + intercept);
    sse += residual * residual;
  }
  return { slope, intercept, sse };
}

interface Candidate {
  b: number;
  qi: number;
  di: number;
  sse: number;
}

function logRate(qi: number, di: number, b: number, t: number): number {
  if (b <= B_EPSILON) return Math.log(qi) - di * t;
  if (b >= 1 - B_EPSILON) return Math.log(qi) - Math.log1p(di * t);
  return Math.log(qi) - Math.log1p(b * di * t) / b;
}

function candidateForB(
  b: number,
  t: readonly number[],
  q: readonly number[],
  logQ: readonly number[],
): Candidate | null {
  // For a fixed b, q^-b is linear in t:
  // q^-b = qi^-b + b * di * qi^-b * t.
  let qi: number;
  let di: number;
  let sse: number;
  if (b <= B_EPSILON) {
    const fit = linearFit(t, logQ);
    if (fit === null) return null;
    qi = Math.exp(fit.intercept);
    di = -fit.slope;
    sse = fit.sse;
  } else {
    const transformed = q.map((value) => value ** -b);
    const fit = linearFit(t, transformed);
    if (fit === null) return null;
    if (fit.intercept <= 0 || fit.slope < -1e-12) return null;
    const a = fit.intercept;
    const slope = Math.max(0, fit.slope);
    qi = a ** (-1 / b);
    di = slope / (b * a);
    sse = 0;
    for (let index = 0; index < t.length; index += 1) {
      const ti = t[index];
      const qiLog = logQ[index];
      if (ti === undefined || qiLog === undefined) return null;
      const residual = qiLog - logRate(qi, di, b, ti);
      sse += residual * residual;
    }
  }

  if (!Number.isFinite(qi) || !Number.isFinite(di) || qi <= 0 || di < 0) return null;
  return { b, qi, di, sse };
}

function modelFromB(b: number): ArpsModel {
  if (b <= 0.01) return 'exponential';
  if (b >= 0.99) return 'harmonic';
  return 'hyperbolic';
}

/**
 * Fits an Arps decline to positive rate points.
 *
 * @param t - Days from the start of the fitting window.
 * @param q - Rates in any consistent unit; non-positive or non-finite points are ignored.
 * @param options - Model selection and upper bound for b.
 * @throws When fewer than six positive points remain or the inputs are inconsistent.
 */
export function fitArps(
  t: readonly number[],
  q: readonly number[],
  options: ArpsFitOptions = {},
): ArpsFit {
  if (t.length !== q.length) throw new Error('t and q must have the same length');
  const pointsT: number[] = [];
  const pointsQ: number[] = [];
  for (let index = 0; index < t.length; index += 1) {
    const time = t[index];
    const rate = q[index];
    if (time === undefined || rate === undefined) continue;
    if (!Number.isFinite(time) || !Number.isFinite(rate) || time < 0 || rate <= 0) continue;
    pointsT.push(time);
    pointsQ.push(rate);
  }
  if (pointsT.length < MIN_POINTS) {
    throw new Error(`At least ${String(MIN_POINTS)} positive rate points are required`);
  }

  const model = options.model ?? 'auto';
  const bMax = options.bMax ?? 1;
  if (!Number.isFinite(bMax) || bMax <= 0 || bMax > 1) {
    throw new Error('bMax must be between 0 and 1');
  }
  if (model === 'exponential') {
    const candidate = candidateForB(
      0,
      pointsT,
      pointsQ,
      pointsQ.map((value) => Math.log(value)),
    );
    if (candidate === null) throw new Error('The exponential fit did not converge');
    return toFit(candidate, 'exponential', pointsT, pointsQ);
  }
  if (model === 'harmonic') {
    const candidate = candidateForB(
      1,
      pointsT,
      pointsQ,
      pointsQ.map((value) => Math.log(value)),
    );
    if (candidate === null) throw new Error('The harmonic fit did not converge');
    return toFit(candidate, 'harmonic', pointsT, pointsQ);
  }

  const logQ = pointsQ.map((value) => Math.log(value));
  const gridStep = bMax / B_GRID_STEPS;
  let best: Candidate | null = null;
  for (let index = 0; index <= B_GRID_STEPS; index += 1) {
    const b = gridStep * index;
    const candidate = candidateForB(b, pointsT, pointsQ, logQ);
    if (candidate !== null && (best === null || candidate.sse < best.sse)) best = candidate;
  }
  if (best === null) throw new Error('The hyperbolic fit did not converge');

  // Refine the best grid interval; the grid alone leaves too much error in qi and di.
  const sseForB = (b: number): number =>
    candidateForB(b, pointsT, pointsQ, logQ)?.sse ?? Number.POSITIVE_INFINITY;
  let low = Math.max(0, best.b - gridStep);
  let high = Math.min(bMax, best.b + gridStep);
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const left = low + (high - low) * 0.381966;
    const right = high - (high - low) * 0.381966;
    if (sseForB(left) < sseForB(right)) high = right;
    else low = left;
  }
  const refined = candidateForB((low + high) / 2, pointsT, pointsQ, logQ);
  if (refined !== null && refined.sse < best.sse) best = refined;

  const label = model === 'auto' ? modelFromB(best.b) : 'hyperbolic';
  return toFit(best, label, pointsT, pointsQ, logQ);
}

function toFit(
  candidate: Candidate,
  model: ArpsModel,
  t: readonly number[],
  q: readonly number[],
  logQ: readonly number[] = q.map((value) => Math.log(value)),
): ArpsFit {
  const mean = logQ.reduce((sum, value) => sum + value, 0) / logQ.length;
  let sst = 0;
  for (const value of logQ) sst += (value - mean) ** 2;
  const r2 = sst < 1e-12 ? 1 : Math.max(0, 1 - candidate.sse / sst);
  return {
    model,
    qi: candidate.qi,
    di: candidate.di,
    b: candidate.b,
    r2,
    n: t.length,
  };
}

/** Rate at time `t` (days) for a fitted decline. */
export function rateAt(fit: ArpsFit, t: number): number {
  if (!Number.isFinite(t) || t < 0) throw new Error('t must be a non-negative number of days');
  if (fit.di === 0) return fit.qi;
  if (fit.b <= B_EPSILON) return fit.qi * Math.exp(-fit.di * t);
  if (fit.b >= 1 - B_EPSILON) return fit.qi / (1 + fit.di * t);
  return fit.qi / (1 + fit.b * fit.di * t) ** (1 / fit.b);
}

/** Cumulative production from t = 0 to `t`, in rate units multiplied by days. */
export function cumulativeAt(fit: ArpsFit, t: number): number {
  if (!Number.isFinite(t) || t < 0) throw new Error('t must be a non-negative number of days');
  if (fit.di === 0) return fit.qi * t;
  const q = rateAt(fit, t);
  if (fit.b <= B_EPSILON) return (fit.qi - q) / fit.di;
  if (fit.b >= 1 - B_EPSILON) return (fit.qi / fit.di) * Math.log(fit.qi / q);
  return (fit.qi ** fit.b / ((1 - fit.b) * fit.di)) * (fit.qi ** (1 - fit.b) - q ** (1 - fit.b));
}

/** Rate forecast from t = 0 to `days`, inclusive, with the requested step. */
export function forecast(fit: ArpsFit, days: number, step = 1): { t: number[]; q: number[] } {
  if (!Number.isFinite(days) || days < 0) throw new Error('days must be a non-negative number');
  if (!Number.isFinite(step) || step <= 0) throw new Error('step must be positive');
  const t: number[] = [];
  for (let index = 0; index * step <= days + 1e-9; index += 1) t.push(index * step);
  const last = t.at(-1) ?? 0;
  if (last < days - 1e-9) t.push(days);
  return { t, q: t.map((time) => rateAt(fit, time)) };
}

/**
 * Estimated ultimate recovery: the cumulative from the start of the fitted window plus the
 * volume produced down to the economic rate limit.
 */
export function eur(fit: ArpsFit, qLimit: number, cumulativeToWindowStart: number): number {
  if (!Number.isFinite(qLimit) || qLimit <= 0) throw new Error('qLimit must be positive');
  if (!Number.isFinite(cumulativeToWindowStart) || cumulativeToWindowStart < 0) {
    throw new Error('cumulativeToWindowStart must be non-negative');
  }
  if (fit.qi <= qLimit) return cumulativeToWindowStart;
  if (fit.di === 0) return Infinity;
  const ratio = fit.qi / qLimit;
  const time =
    fit.b <= B_EPSILON
      ? Math.log(ratio) / fit.di
      : fit.b >= 1 - B_EPSILON
        ? (ratio - 1) / fit.di
        : (ratio ** fit.b - 1) / (fit.b * fit.di);
  return cumulativeToWindowStart + cumulativeAt(fit, time);
}
