/**
 * Black-oil PVT correlations (docs/08, "PVT"). The empirical equations use field units:
 * pressure in psia, temperature in °F, solution gas in scf/STB and viscosity in cP.
 *
 * References:
 * - Standing, M.B. (1947), "A Pressure-Volume-Temperature Correlation for Mixtures of
 *   California Oils and Gases", API Drilling and Production Practice.
 * - Vasquez, M. and Beggs, H.D. (1980), "Correlations for Fluid Physical Property Prediction",
 *   JPT 32(6), SPE 6719.
 * - Beggs, H.D. and Robinson, J.R. (1975), "Estimating the Viscosity of Crude Oil Systems",
 *   JPT 27(9), SPE 5434.
 */

export interface PvtInput {
  /** Stock-tank oil gravity, °API. */
  api: number;
  /** Gas specific gravity relative to air. */
  gasGravity: number;
  /** Reservoir temperature, °F. */
  temperatureF: number;
  /** Solution gas-oil ratio at the bubble point, scf/STB. */
  solutionGasScfStb: number;
}

export interface PvtResult {
  bubblePointPsia: number;
  solutionGasScfStb: number;
  oilFormationVolumeFactor: number;
  /** Saturated oil viscosity, cP. */
  oilViscosityCp: number;
}

export interface SolutionGasInput {
  api: number;
  gasGravity: number;
  temperatureF: number;
  pressurePsia: number;
}

function validate(input: PvtInput): void {
  if (!Number.isFinite(input.api)) throw new Error('API gravity must be a finite number');
  if (!Number.isFinite(input.gasGravity) || input.gasGravity <= 0) {
    throw new Error('Gas gravity must be positive');
  }
  if (!Number.isFinite(input.temperatureF) || input.temperatureF <= -459.67) {
    throw new Error('Temperature must be above absolute zero');
  }
  if (!Number.isFinite(input.solutionGasScfStb) || input.solutionGasScfStb < 0) {
    throw new Error('Solution gas must be non-negative');
  }
}

function validateSolutionGas(input: SolutionGasInput): void {
  if (!Number.isFinite(input.api)) throw new Error('API gravity must be a finite number');
  if (!Number.isFinite(input.gasGravity) || input.gasGravity <= 0) {
    throw new Error('Gas gravity must be positive');
  }
  if (!Number.isFinite(input.temperatureF) || input.temperatureF <= -459.67) {
    throw new Error('Temperature must be above absolute zero');
  }
  if (!Number.isFinite(input.pressurePsia) || input.pressurePsia <= 0) {
    throw new Error('Pressure must be positive');
  }
}

/** Oil specific gravity from API gravity. */
export function oilSpecificGravity(api: number): number {
  return 141.5 / (131.5 + api);
}

/** Standing solution gas-oil ratio at a pressure, scf/STB. */
export function standingSolutionGas(input: SolutionGasInput): number {
  validateSolutionGas(input);
  const { api, gasGravity, temperatureF, pressurePsia } = input;
  return (
    gasGravity *
    ((pressurePsia / 18.2 + 1.4) * 10 ** (0.0125 * api - 0.00091 * temperatureF)) ** 1.2048
  );
}

/** Standing bubble point pressure, psia. */
export function standingBubblePoint(input: PvtInput): number {
  validate(input);
  const { api, gasGravity, temperatureF, solutionGasScfStb } = input;
  return (
    18.2 *
    ((solutionGasScfStb / gasGravity) ** 0.83 * 10 ** (0.00091 * temperatureF - 0.0125 * api) - 1.4)
  );
}

/** Standing oil formation volume factor at the bubble point, bbl/STB. */
export function standingOilVolumeFactor(input: PvtInput): number {
  validate(input);
  const { api, gasGravity, temperatureF, solutionGasScfStb } = input;
  const oilGravity = oilSpecificGravity(api);
  return (
    0.9759 +
    0.00012 * (solutionGasScfStb * (gasGravity / oilGravity) ** 0.5 + 1.25 * temperatureF) ** 1.2
  );
}

/** Vasquez-Beggs coefficients; the correlation splits at 30 °API. */
function vasquezCoefficients(api: number): {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c6: number;
} {
  return api <= 30
    ? { c1: 0.0362, c2: 1.0937, c3: 25.724, c4: 4.677e-4, c5: 1.751e-5, c6: -1.811e-8 }
    : { c1: 0.0178, c2: 1.187, c3: 23.931, c4: 4.67e-4, c5: 1.1e-5, c6: 1.337e-9 };
}

/** Vasquez-Beggs bubble point pressure, psia. */
export function vasquezBeggsBubblePoint(input: PvtInput): number {
  validate(input);
  const { c1, c2, c3 } = vasquezCoefficients(input.api);
  const denominator =
    c1 * input.gasGravity * Math.exp((c3 * input.api) / (input.temperatureF + 460));
  return (input.solutionGasScfStb / denominator) ** (1 / c2);
}

/** Vasquez-Beggs oil formation volume factor at the bubble point, bbl/STB. */
export function vasquezBeggsOilVolumeFactor(input: PvtInput): number {
  validate(input);
  const { c4, c5, c6 } = vasquezCoefficients(input.api);
  const temperatureFactor = (input.temperatureF - 60) * (input.api / input.gasGravity);
  return 1 + c4 * input.solutionGasScfStb + temperatureFactor * (c5 + c6 * input.solutionGasScfStb);
}

/** Vasquez-Beggs solution gas-oil ratio at a pressure, scf/STB. */
export function vasquezBeggsSolutionGas(input: SolutionGasInput): number {
  validateSolutionGas(input);
  const { c1, c2, c3 } = vasquezCoefficients(input.api);
  return (
    c1 *
    input.gasGravity *
    input.pressurePsia ** c2 *
    Math.exp((c3 * input.api) / (input.temperatureF + 460))
  );
}

/** Dead-oil viscosity from Beggs and Robinson, cP. */
export function beggsRobinsonDeadOil(api: number, temperatureF: number): number {
  if (!Number.isFinite(api)) throw new Error('API gravity must be a finite number');
  if (!Number.isFinite(temperatureF) || temperatureF <= -459.67) {
    throw new Error('Temperature must be above absolute zero');
  }
  const y = 10 ** (3.0324 - 0.02023 * api);
  const x = y * temperatureF ** -1.163;
  return 10 ** x - 1;
}

/** Saturated oil viscosity from Beggs and Robinson, cP. */
export function beggsRobinson(input: PvtInput): number {
  validate(input);
  const deadOil = beggsRobinsonDeadOil(input.api, input.temperatureF);
  const a = 10.715 * (input.solutionGasScfStb + 100) ** -0.515;
  const b = 5.44 * (input.solutionGasScfStb + 150) ** -0.338;
  return a * deadOil ** b;
}

/** Standing PVT result at the bubble point. */
export function standing(input: PvtInput): PvtResult {
  return {
    bubblePointPsia: standingBubblePoint(input),
    solutionGasScfStb: input.solutionGasScfStb,
    oilFormationVolumeFactor: standingOilVolumeFactor(input),
    oilViscosityCp: beggsRobinson(input),
  };
}

/** Vasquez-Beggs PVT result at the bubble point. */
export function vasquezBeggs(input: PvtInput): PvtResult {
  return {
    bubblePointPsia: vasquezBeggsBubblePoint(input),
    solutionGasScfStb: input.solutionGasScfStb,
    oilFormationVolumeFactor: vasquezBeggsOilVolumeFactor(input),
    oilViscosityCp: beggsRobinson(input),
  };
}
