import { describe, expect, it } from 'vitest';

import {
  beggsRobinson,
  beggsRobinsonDeadOil,
  oilSpecificGravity,
  standing,
  standingBubblePoint,
  standingOilVolumeFactor,
  standingSolutionGas,
  vasquezBeggs,
  vasquezBeggsBubblePoint,
  vasquezBeggsSolutionGas,
} from './pvt.ts';

// Worked example from CamPetro, "Oil FVF and Bubble Point": API 35, gas gravity 0.75,
// 200 °F and Rs = 600 scf/STB.
const EXAMPLE = {
  api: 35,
  gasGravity: 0.75,
  temperatureF: 200,
  solutionGasScfStb: 600,
};

describe('Standing correlations', () => {
  it('matches the published bubble point and formation volume factor', () => {
    const result = standing(EXAMPLE);

    expect(Math.abs(result.bubblePointPsia - 2570)).toBeLessThan(2);
    expect(result.oilFormationVolumeFactor).toBeCloseTo(1.3489, 3);
    expect(result.solutionGasScfStb).toBe(600);
  });

  it('inverts the solution gas correlation at the bubble point', () => {
    const bubblePoint = standingBubblePoint(EXAMPLE);
    const solutionGas = standingSolutionGas({
      api: EXAMPLE.api,
      gasGravity: EXAMPLE.gasGravity,
      temperatureF: EXAMPLE.temperatureF,
      pressurePsia: bubblePoint,
    });

    expect(solutionGas).toBeCloseTo(600, 0);
  });

  it('exposes the individual correlations', () => {
    expect(standingOilVolumeFactor(EXAMPLE)).toBeCloseTo(1.3489, 3);
    expect(oilSpecificGravity(35)).toBeCloseTo(0.8498, 4);
  });
});

describe('Vasquez-Beggs correlations', () => {
  it('matches the published bubble point and formation volume factor', () => {
    const result = vasquezBeggs(EXAMPLE);

    expect(Math.abs(result.bubblePointPsia - 2853)).toBeLessThan(2);
    expect(result.oilFormationVolumeFactor).toBeCloseTo(1.3573, 3);
  });

  it('inverts the solution gas correlation at the bubble point', () => {
    const bubblePoint = vasquezBeggsBubblePoint(EXAMPLE);
    const solutionGas = vasquezBeggsSolutionGas({
      api: EXAMPLE.api,
      gasGravity: EXAMPLE.gasGravity,
      temperatureF: EXAMPLE.temperatureF,
      pressurePsia: bubblePoint,
    });

    expect(solutionGas).toBeCloseTo(600, 2);
  });
});

describe('Beggs-Robinson viscosity', () => {
  it('matches the published saturated viscosity example', () => {
    const input = { api: 22, temperatureF: 137, solutionGasScfStb: 90 };

    expect(beggsRobinsonDeadOil(input.api, input.temperatureF)).toBeCloseTo(17.44, 2);
    expect(beggsRobinson({ ...input, gasGravity: 0.9 })).toBeCloseTo(8.24, 2);
  });
});

describe('PVT input validation', () => {
  it('rejects invalid fluid properties', () => {
    expect(() => standing({ ...EXAMPLE, gasGravity: 0 })).toThrow('Gas gravity must be positive');
    expect(() => standing({ ...EXAMPLE, solutionGasScfStb: -1 })).toThrow(
      'Solution gas must be non-negative',
    );
    expect(() => standingSolutionGas({ ...EXAMPLE, pressurePsia: 0 })).toThrow(
      'Pressure must be positive',
    );
    expect(() => beggsRobinsonDeadOil(35, -460)).toThrow('Temperature must be above absolute zero');
  });
});
