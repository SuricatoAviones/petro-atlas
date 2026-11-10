import { describe, expect, it } from 'vitest';

import {
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
});
