import { describe, expect, it } from 'vitest';

import {
  BBL_PER_SM3,
  PSI_PER_BAR,
  SCF_PER_SM3,
  SCF_PER_STB_PER_SM3_PER_SM3,
  barToPsi,
  convert,
  psiToBar,
  toField,
  toSI,
} from './units.ts';

describe('pressure conversion', () => {
  it('matches the bar to psi factor listed in docs/08', () => {
    expect(PSI_PER_BAR).toBeCloseTo(14.5038, 4);
  });

  it('converts one psi to 6.894 757 kPa (NIST SP 811, Appendix B.8)', () => {
    const pressurePa = psiToBar(1) * 100_000;
    expect(pressurePa).toBeCloseTo(6894.757, 3);
  });

  it('converts one standard atmosphere, 1.013 25 bar, to 14.6959 psi', () => {
    expect(barToPsi(1.01325)).toBeCloseTo(14.6959, 4);
  });

  it('keeps zero as zero', () => {
    expect(barToPsi(0)).toBe(0);
    expect(psiToBar(0)).toBe(0);
  });

  it.each([0.5, 1, 38.6, 241.7, 1_000, 25_000])(
    'returns the original value after a bar → psi → bar round trip (%d bar)',
    (pressureBar) => {
      expect(psiToBar(barToPsi(pressureBar))).toBeCloseTo(pressureBar, 10);
    },
  );
});

describe('volume and ratio conversions', () => {
  it('matches the factors listed in docs/08', () => {
    expect(convert(1, 'Sm3', 'bbl')).toBeCloseTo(BBL_PER_SM3, 10);
    expect(convert(1, 'Sm3', 'scf')).toBeCloseTo(SCF_PER_SM3, 10);
    expect(convert(1, 'Sm3/Sm3', 'scf/STB')).toBeCloseTo(SCF_PER_STB_PER_SM3_PER_SM3, 10);
  });

  it('converts 15.6 Sm3 of oil to about 98.1 bbl', () => {
    expect(convert(15.6, 'Sm3', 'bbl')).toBeCloseTo(98.12, 1);
  });

  it('converts 1 Sm3 of gas to about 35.31 scf', () => {
    expect(convert(1, 'Sm3', 'scf')).toBeCloseTo(35.3147, 4);
  });

  it('round-trips liquid, gas and GOR values through field units', () => {
    for (const value of [0, 1, 15.6, 1234.5]) {
      expect(toSI(toField(value, 'liquidVolume'), 'liquidVolume')).toBeCloseTo(value, 10);
      expect(toSI(toField(value, 'gasVolume'), 'gasVolume')).toBeCloseTo(value, 10);
      expect(toSI(toField(value, 'gasOilRatio'), 'gasOilRatio')).toBeCloseTo(value, 10);
      expect(toSI(toField(value, 'length'), 'length')).toBeCloseTo(value, 10);
    }
  });

  it('converts temperatures with the offset', () => {
    expect(toField(0, 'temperature')).toBeCloseTo(32, 10);
    expect(toField(100, 'temperature')).toBeCloseTo(212, 10);
    expect(toSI(32, 'temperature')).toBeCloseTo(0, 10);
    expect(toSI(212, 'temperature')).toBeCloseTo(100, 10);
  });

  it('rejects incompatible quantities', () => {
    expect(() => convert(1, 'bar', 'm')).toThrow('Cannot convert bar to m');
  });
});
