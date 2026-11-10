import { describe, expect, it } from 'vitest';

import type { ImportedWell } from './imported-wells';
import { importedDetail, importedProduction } from './well-repository';

const well: ImportedWell = {
  slug: 'VE-01',
  name: 'VE-01',
  latDeg: 10.5,
  lonDeg: -71.6,
  importedAt: '2026-11-10T00:00:00.000Z',
  dates: ['2026-01-01', '2026-01-02'],
  series: {
    oil: [10, 20],
    gas: [100, 200],
    water: [1, null],
    onStream: [24, 12],
    bhp: [null, 180],
    whp: [30, null],
    choke: [40, 42],
  },
};

describe('importedProduction', () => {
  it('maps the stored columns to the series the charts expect', () => {
    const production = importedProduction(well);

    expect(production.interval).toBe('day');
    expect(production.dates).toEqual(well.dates);
    expect(production.series.oil).toEqual([10, 20]);
    expect(production.series.water).toEqual([1, null]);
    expect(production.series.waterInj).toEqual([null, null]);
    expect(production.series.bht).toEqual([null, null]);
    expect(production.series.bhp).toEqual([null, 180]);
    expect(production.source.name).toContain('CSV');
  });
});

describe('importedDetail', () => {
  it('reports the date range and the data a CSV cannot carry', () => {
    const detail = importedDetail(well);

    expect(detail).toMatchObject({
      slug: 'VE-01',
      status: 'unknown',
      wellType: null,
      spudDate: null,
      totalDepthM: null,
      location: { latDeg: 10.5, lonDeg: -71.6 },
      field: null,
      series: {
        daily: { from: '2026-01-01', to: '2026-01-02', days: 2 },
        hasTrajectory: false,
        logCurves: [],
      },
    });
  });
});
