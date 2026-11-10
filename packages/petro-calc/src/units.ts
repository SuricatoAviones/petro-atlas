/**
 * Unit conversions between SI, used for storage and computation, and oilfield units, used for
 * display (docs/08-motor-de-calculos.md, "Conversiones").
 *
 * Pressure factors are derived from exact definitions. The volume and gas-oil-ratio factors are
 * the published values listed in docs/08. Reference: NIST Special Publication 811 (2008),
 * Appendix B.8; Standing (1952) for the GOR conversion.
 *
 * @packageDocumentation
 */

/** 1 bar = 100 000 Pa, exact by definition. */
const PASCALS_PER_BAR = 100_000;

/**
 * 1 psi = 1 lbf/inA�, exact by definition of the international pound (0.453 592 37 kg), standard
 * gravity (9.806 65 m/sA�) and the inch (0.0254 m): 6 894.757 293 168�?� Pa.
 */
const PASCALS_PER_PSI = (0.45359237 * 9.80665) / 0.0254 ** 2;

/** Pounds per square inch in one bar, about 14.5038. */
export const PSI_PER_BAR = PASCALS_PER_BAR / PASCALS_PER_PSI;
/** Barrels in one standard cubic metre, as listed in docs/08. */
export const BBL_PER_SM3 = 6.2898;
/** Standard cubic feet in one standard cubic metre, as listed in docs/08. */
export const SCF_PER_SM3 = 35.3147;
/** scf/STB in one SmA3/SmA3, as listed in docs/08. */
export const SCF_PER_STB_PER_SM3_PER_SM3 = 5.6146;

export type Quantity =
  'pressure' | 'liquidVolume' | 'gasVolume' | 'gasOilRatio' | 'temperature' | 'length';

export type Unit =
  'bar' | 'psi' | 'Sm3' | 'bbl' | 'scf' | 'Sm3/Sm3' | 'scf/STB' | 'degC' | 'degF' | 'm' | 'ft';

interface UnitDefinition {
  quantity: Quantity;
  toSI: (value: number) => number;
  fromSI: (value: number) => number;
}

const UNITS: Record<Unit, UnitDefinition> = {
  bar: { quantity: 'pressure', toSI: (value) => value, fromSI: (value) => value },
  psi: {
    quantity: 'pressure',
    toSI: (value) => value / PSI_PER_BAR,
    fromSI: (value) => value * PSI_PER_BAR,
  },
  Sm3: { quantity: 'liquidVolume', toSI: (value) => value, fromSI: (value) => value },
  bbl: {
    quantity: 'liquidVolume',
    toSI: (value) => value / BBL_PER_SM3,
    fromSI: (value) => value * BBL_PER_SM3,
  },
  scf: {
    quantity: 'gasVolume',
    toSI: (value) => value / SCF_PER_SM3,
    fromSI: (value) => value * SCF_PER_SM3,
  },
  'Sm3/Sm3': { quantity: 'gasOilRatio', toSI: (value) => value, fromSI: (value) => value },
  'scf/STB': {
    quantity: 'gasOilRatio',
    toSI: (value) => value / SCF_PER_STB_PER_SM3_PER_SM3,
    fromSI: (value) => value * SCF_PER_STB_PER_SM3_PER_SM3,
  },
  degC: { quantity: 'temperature', toSI: (value) => value, fromSI: (value) => value },
  degF: {
    quantity: 'temperature',
    toSI: (value) => ((value - 32) * 5) / 9,
    fromSI: (value) => (value * 9) / 5 + 32,
  },
  m: { quantity: 'length', toSI: (value) => value, fromSI: (value) => value },
  ft: { quantity: 'length', toSI: (value) => value / 3.28084, fromSI: (value) => value * 3.28084 },
};

/** Converts a value between two units of the same quantity. */
export function convert(value: number, from: Unit, to: Unit): number {
  // Sm3 is the SI unit of both liquid and gas volume; the destination disambiguates it.
  if (from === 'Sm3' && to === 'scf') return value * SCF_PER_SM3;
  if (from === 'scf' && to === 'Sm3') return value / SCF_PER_SM3;

  const source = UNITS[from];
  const target = UNITS[to];
  if (source.quantity !== target.quantity) {
    throw new Error(`Cannot convert ${from} to ${to}`);
  }
  return target.fromSI(source.toSI(value));
}

/** Converts an SI value of `quantity` to its oilfield counterpart. */
export function toField(value: number, quantity: Quantity): number {
  switch (quantity) {
    case 'pressure':
      return convert(value, 'bar', 'psi');
    case 'liquidVolume':
      return convert(value, 'Sm3', 'bbl');
    case 'gasVolume':
      return convert(value, 'Sm3', 'scf');
    case 'gasOilRatio':
      return convert(value, 'Sm3/Sm3', 'scf/STB');
    case 'temperature':
      return convert(value, 'degC', 'degF');
    case 'length':
      return convert(value, 'm', 'ft');
  }
}

/** Converts an oilfield value of `quantity` back to SI. */
export function toSI(value: number, quantity: Quantity): number {
  switch (quantity) {
    case 'pressure':
      return convert(value, 'psi', 'bar');
    case 'liquidVolume':
      return convert(value, 'bbl', 'Sm3');
    case 'gasVolume':
      return convert(value, 'scf', 'Sm3');
    case 'gasOilRatio':
      return convert(value, 'scf/STB', 'Sm3/Sm3');
    case 'temperature':
      return convert(value, 'degF', 'degC');
    case 'length':
      return convert(value, 'ft', 'm');
  }
}

/**
 * Converts a pressure from bar to psi.
 *
 * @param pressureBar - Pressure in bar.
 * @returns Pressure in psi.
 */
export function barToPsi(pressureBar: number): number {
  return pressureBar * PSI_PER_BAR;
}

/**
 * Converts a pressure from psi to bar.
 *
 * @param pressurePsi - Pressure in psi.
 * @returns Pressure in bar.
 */
export function psiToBar(pressurePsi: number): number {
  return pressurePsi / PSI_PER_BAR;
}
