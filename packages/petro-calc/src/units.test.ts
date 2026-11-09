import { describe, expect, it } from 'vitest';

import { PSI_PER_BAR, barToPsi, psiToBar } from './units.ts';

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
