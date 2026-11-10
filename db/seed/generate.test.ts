import { describe, expect, it } from 'vitest';

import {
  LOGGED_WELL_COUNT,
  PRODUCTION_DAYS,
  PRODUCTION_START_DATE,
  generateSyntheticDataset,
  type DailyProductionRow,
} from './generate.ts';

const dataset = generateSyntheticDataset();

function rowsOf(wellName: string): DailyProductionRow[] {
  return dataset.production.filter((row) => row.wellName === wellName);
}

function wellsOfType(wellType: string): string[] {
  return dataset.wells.filter((well) => well.wellType === wellType).map((well) => well.name);
}

describe('generateSyntheticDataset', () => {
  it('is deterministic', () => {
    expect(generateSyntheticDataset()).toEqual(dataset);
  });

  it('creates one field and twenty wells with clearly fictitious, unique names', () => {
    expect(dataset.field.name).toMatch(/SYNTHETIC/);
    expect(dataset.wells).toHaveLength(20);
    const names = dataset.wells.map((well) => well.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^SYN-/);
  });

  it('places every well inside the field boundary', () => {
    const lons = dataset.field.boundary.map(([lon]) => lon);
    const lats = dataset.field.boundary.map(([, lat]) => lat);
    for (const well of dataset.wells) {
      expect(well.lon).toBeGreaterThan(Math.min(...lons));
      expect(well.lon).toBeLessThan(Math.max(...lons));
      expect(well.lat).toBeGreaterThan(Math.min(...lats));
      expect(well.lat).toBeLessThan(Math.max(...lats));
    }
  });

  it('aggregates the field production into twelve months', () => {
    expect(dataset.fieldProduction).toHaveLength(12);
    expect(dataset.fieldProduction[0]?.month).toBe('2025-01-01');
    expect(dataset.fieldProduction.at(-1)?.month).toBe('2025-12-01');
    for (const month of dataset.fieldProduction) {
      expect(month.oilSm3).toBeGreaterThan(0);
      expect(month.gasSm3).toBeGreaterThan(0);
      expect(month.waterSm3).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every well a trajectory that reaches its total depth', () => {
    for (const well of dataset.wells) {
      const stations = dataset.trajectories.filter((station) => station.wellName === well.name);
      expect(stations.length).toBeGreaterThan(1);
      expect(stations[0]?.mdM).toBe(0);
      expect(stations.at(-1)?.mdM).toBe(well.totalDepthM);
    }
  });

  it('gives every well with data one row per day for one year', () => {
    for (const well of dataset.wells) {
      const dates = rowsOf(well.name).map((row) => row.date);
      if (well.wellType === 'exploration') {
        expect(dates).toHaveLength(0);
        continue;
      }
      expect(dates).toHaveLength(PRODUCTION_DAYS);
      expect(dates[0]).toBe(PRODUCTION_START_DATE);
      expect(dates.at(-1)).toBe('2025-12-31');
      expect(new Set(dates).size).toBe(PRODUCTION_DAYS);
    }
  });

  it('only produces physically valid values (docs/10, ETL rule 5)', () => {
    for (const row of dataset.production) {
      for (const volumeSm3 of [row.oilSm3, row.gasSm3, row.waterSm3, row.waterInjSm3]) {
        if (volumeSm3 !== null) expect(volumeSm3).toBeGreaterThanOrEqual(0);
      }
      if (row.onStreamH !== null) {
        expect(row.onStreamH).toBeGreaterThanOrEqual(0);
        expect(row.onStreamH).toBeLessThanOrEqual(24);
      }
      if (row.chokePct !== null) {
        expect(row.chokePct).toBeGreaterThanOrEqual(0);
        expect(row.chokePct).toBeLessThanOrEqual(100);
      }
    }
  });

  it('records zero volumes on days a producer is shut in', () => {
    const shutInDays = dataset.production.filter(
      (row) => row.onStreamH === 0 && row.oilSm3 !== null,
    );
    expect(shutInDays.length).toBeGreaterThan(0);
    for (const row of shutInDays) {
      expect(row.oilSm3).toBe(0);
      expect(row.gasSm3).toBe(0);
    }
  });

  it('keeps missing measurements as null, never zero', () => {
    for (const wellName of wellsOfType('injector')) {
      for (const row of rowsOf(wellName)) {
        expect(row.oilSm3).toBeNull();
        expect(row.gasSm3).toBeNull();
      }
    }
    const producersWithoutGauge = wellsOfType('producer').filter((wellName) =>
      rowsOf(wellName).every((row) => row.bhpBar === null),
    );
    expect(producersWithoutGauge.length).toBeGreaterThan(0);
  });

  it('leaves downhole pressure gaps only where a gauge is missing or out', () => {
    const bhpDaysByWell = wellsOfType('producer').map(
      (wellName) => rowsOf(wellName).filter((row) => row.bhpBar !== null).length,
    );
    // Full year with a gauge, none without one, and one well with a 20-day outage.
    expect(new Set(bhpDaysByWell)).toEqual(new Set([PRODUCTION_DAYS, 0, PRODUCTION_DAYS - 20]));
    expect(bhpDaysByWell.filter((days) => days === PRODUCTION_DAYS - 20)).toHaveLength(1);
  });

  it('declines oil production over the year for a producing well', () => {
    const rows = rowsOf('SYN-A-01').filter((row) => row.onStreamH === 24);
    const firstMonthOilSm3 = rows.slice(0, 30).reduce((sum, row) => sum + (row.oilSm3 ?? 0), 0);
    const lastMonthOilSm3 = rows.slice(-30).reduce((sum, row) => sum + (row.oilSm3 ?? 0), 0);
    expect(lastMonthOilSm3).toBeLessThan(firstMonthOilSm3);
  });

  it('logs the first producers with four curves at a constant step', () => {
    const loggedWells = new Set(dataset.logs.map((curve) => curve.wellName));
    expect(loggedWells.size).toBe(LOGGED_WELL_COUNT);
    for (const wellName of loggedWells) {
      const curves = dataset.logs.filter((curve) => curve.wellName === wellName);
      const well = dataset.wells.find((candidate) => candidate.name === wellName);
      expect(curves.map((curve) => curve.mnemonic)).toEqual(['GR', 'RT', 'RHOB', 'NPHI']);
      for (const curve of curves) {
        expect(curve.baseM).toBe(well?.totalDepthM);
        expect(curve.topM).toBeLessThan(curve.baseM);
        // One sample per metre, both ends included.
        expect(curve.samples).toHaveLength(curve.baseM - curve.topM + 1);
      }
    }
  });

  it('keeps log values in plausible ranges and leaves one gap as null', () => {
    const ranges: Record<string, [number, number]> = {
      GR: [0, 200],
      RT: [0.1, 2000],
      RHOB: [1.9, 2.9],
      NPHI: [0, 0.6],
    };
    for (const curve of dataset.logs) {
      const [minimum, maximum] = ranges[curve.mnemonic] ?? [0, 0];
      for (const sample of curve.samples) {
        if (sample === null) continue;
        expect(sample).toBeGreaterThanOrEqual(minimum);
        expect(sample).toBeLessThanOrEqual(maximum);
      }
    }
    const missing = dataset.logs.filter((curve) => curve.samples.includes(null));
    expect(missing.map((curve) => [curve.wellName, curve.mnemonic])).toEqual([
      ['SYN-A-01', 'RHOB'],
    ]);
  });
});
