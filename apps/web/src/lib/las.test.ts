import { describe, expect, it } from 'vitest';

import { parseLas } from './las';

const SAMPLE = `~Version
VERS. 2.0 : CWLS
WRAP. NO
~Well
STRT.M 1000.0
STOP.M 1002.0
STEP.M 1.0
NULL. -999.25
WELL. VE-01
~Curve
DEPT.M : Depth
GR.GAPI : Gamma ray
RHOB.G/C3 : Density
~Ascii
1000.0 45.0 2.35
1001.0 -999.25 2.40
1002.0 52.5 -999.25
`;

describe('parseLas', () => {
  it('reads the depth and the curves, keeping nulls as gaps', () => {
    const result = parseLas(SAMPLE);

    expect(result).toMatchObject({ ok: true, wellName: 'VE-01' });
    if (!result.ok) return;
    expect(result.curves.map((curve) => curve.mnemonic)).toEqual(['GR', 'RHOB']);
    expect(result.curves[0]).toMatchObject({
      unit: 'GAPI',
      topM: 1000,
      baseM: 1002,
      stepM: 1,
      values: [45, null, 52.5],
    });
    expect(result.curves[1]?.values).toEqual([2.35, 2.4, null]);
  });

  it('converts feet to metres', () => {
    const result = parseLas(`~W
STRT.F 1000
STEP.F 1
NULL. -999
~C
DEPT.F
GR.GAPI
~A
1000 10
1001 20
`);

    if (!result.ok) throw new Error(result.code);
    expect(result.curves[0]?.topM).toBeCloseTo(304.8, 6);
    expect(result.curves[0]?.stepM).toBeCloseTo(0.3048, 6);
  });

  it('rejects files without curves, data, depth or with incomplete rows', () => {
    expect(parseLas('')).toEqual({ ok: false, code: 'empty' });
    expect(parseLas('~C\nGR.GAPI\nRHOB.G/C3\n~A\n1 2\n')).toEqual({ ok: false, code: 'no_depth' });
    expect(parseLas('~C\nDEPT.M\nGR.GAPI\n~A\n')).toEqual({ ok: false, code: 'no_data' });
    expect(parseLas('~C\nDEPT.M\nGR.GAPI\n~A\n1\n')).toEqual({
      ok: false,
      code: 'incomplete_row',
    });
    expect(parseLas('~C\nDEPT.M\nGR.GAPI\n~A\nx 1\n')).toEqual({ ok: false, code: 'bad_value' });
  });
});
