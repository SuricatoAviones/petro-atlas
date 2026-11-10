import { describe, expect, it } from 'vitest';

import type { ImportedWell } from './imported-wells';
import { importedWellAlert, publicWellAlert, sortAlerts } from './well-alerts';

function isoDate(offset: number): string {
  const date = new Date(Date.UTC(2026, 0, 1));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function importedWell(): ImportedWell {
  const dates = Array.from({ length: 40 }, (_, index) => isoDate(index));
  const oil = dates.map((_, index) => (index < 33 ? 100 : 40));
  const missing = dates.map(() => null);
  return {
    slug: 'VE-01',
    name: 'VE-01',
    latDeg: 10.5,
    lonDeg: -71.6,
    importedAt: '2026-11-10T00:00:00.000Z',
    dates,
    series: {
      oil,
      gas: dates.map(() => 0),
      water: dates.map(() => 10),
      onStream: dates.map(() => 24),
      bhp: missing,
      whp: missing,
      choke: missing,
    },
  };
}

describe('importedWellAlert', () => {
  it('evaluates the same drop rule as the server', () => {
    const alert = importedWellAlert(importedWell());

    expect(alert).not.toBeNull();
    expect(alert?.origin).toBe('imported');
    expect(alert?.wellId).toBeNull();
    expect(alert?.kinds).toContain('production_drop');
    expect(alert?.level).toBe('critical');
    expect(alert?.asOf).toBe(isoDate(39));
    expect(alert?.detail.oil7d).toBeCloseTo(40, 6);
    expect(alert?.detail.oilPrev30).toBeCloseTo(100, 6);
  });

  it('returns null when the series has no alert', () => {
    const well = importedWell();
    const flat = {
      ...well,
      series: {
        ...well.series,
        oil: well.dates.map(() => 100),
      },
    };

    expect(importedWellAlert(flat)).toBeNull();
  });
});

describe('sortAlerts', () => {
  it('puts critical alerts first and then the most recent data', () => {
    const base = publicWellAlert({
      wellId: 1,
      wellSlug: 'A',
      wellName: 'A',
      level: 'warning',
      kinds: ['production_drop'],
      asOf: '2026-01-02',
      detail: { oil7d: 1, oilPrev30: 2, waterCut7d: null, prod3d: null },
    });
    const critical = { ...base, wellId: 2, wellSlug: 'B', level: 'critical' as const };
    const older = { ...base, wellId: 3, wellSlug: 'C', asOf: '2026-01-01' };

    expect(sortAlerts([base, older, critical]).map((alert) => alert.wellSlug)).toEqual([
      'B',
      'A',
      'C',
    ]);
  });
});
