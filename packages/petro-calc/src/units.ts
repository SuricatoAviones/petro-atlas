/**
 * Unit conversions between SI, used for storage and computation, and oilfield units, used for
 * display (docs/08-motor-de-calculos.md, "Conversiones").
 *
 * Factors are derived from exact definitions rather than copied from rounded tables.
 * Reference: NIST Special Publication 811 (2008), Appendix B.8.
 *
 * @packageDocumentation
 */

/** 1 bar = 100 000 Pa, exact by definition. */
const PASCALS_PER_BAR = 100_000;

/**
 * 1 psi = 1 lbf/in², exact by definition of the international pound (0.453 592 37 kg), standard
 * gravity (9.806 65 m/s²) and the inch (0.0254 m): 6 894.757 293 168… Pa.
 */
const PASCALS_PER_PSI = (0.45359237 * 9.80665) / 0.0254 ** 2;

/** Pounds per square inch in one bar, about 14.5038. */
export const PSI_PER_BAR = PASCALS_PER_BAR / PASCALS_PER_PSI;

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
