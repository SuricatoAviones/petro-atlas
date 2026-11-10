import { describe, expect, it } from 'vitest';

import type { ImportedRow, ParsedWell } from './csv-import';
import { mergeWell } from './imported-wells';

function row(date: string, oilSm3: number): ImportedRow {
  return {
    date,
    oilSm3,
    gasSm3: null,
    waterSm3: null,
    onStreamH: 24,
    bhpBar: null,
    whpBar: null,
    chokePct: null,
  };
}

function parsedWell(rows: ImportedRow[], coordinates = true): ParsedWell {
  return {
    name: 'P-01',
    slug: 'P-01',
    latDeg: coordinates ? 9.7 : null,
    lonDeg: coordinates ? -63.1 : null,
    rows,
  };
}

const NOW = '2026-11-10T12:00:00.000Z';

describe('mergeWell', () => {
  it('creates a well with its series in columns, sorted by date', () => {
    const merged = mergeWell(
      null,
      parsedWell([row('2026-01-03', 3), row('2026-01-01', 1), row('2026-01-02', 2)]),
      NOW,
    );

    expect(merged).toMatchObject({ addedRows: 3, skippedRows: 0 });
    expect(merged.well).toMatchObject({
      slug: 'P-01',
      name: 'P-01',
      latDeg: 9.7,
      lonDeg: -63.1,
      importedAt: NOW,
      dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    });
    expect(merged.well?.series.oil).toEqual([1, 2, 3]);
    expect(merged.well?.series.gas).toEqual([null, null, null]);
    expect(merged.well?.series.onStream).toEqual([24, 24, 24]);
  });

  it('skips the days already stored, so importing a file twice changes nothing', () => {
    const first = mergeWell(null, parsedWell([row('2026-01-01', 1), row('2026-01-02', 2)]), NOW);
    const again = mergeWell(
      first.well,
      parsedWell([row('2026-01-01', 99), row('2026-01-02', 99)]),
      '2027-01-01T00:00:00.000Z',
    );

    expect(again).toMatchObject({ addedRows: 0, skippedRows: 2 });
    expect(again.well).toEqual(first.well);
  });

  it('adds only the new days and keeps the first coordinates and import date', () => {
    const first = mergeWell(null, parsedWell([row('2026-01-02', 2)]), NOW);
    const second = mergeWell(
      first.well,
      { ...parsedWell([row('2026-01-01', 1), row('2026-01-02', 99)], false), name: 'p-01 bis' },
      '2027-01-01T00:00:00.000Z',
    );

    expect(second).toMatchObject({ addedRows: 1, skippedRows: 1 });
    expect(second.well).toMatchObject({
      name: 'P-01',
      latDeg: 9.7,
      importedAt: NOW,
      dates: ['2026-01-01', '2026-01-02'],
    });
    expect(second.well?.series.oil).toEqual([1, 2]);
  });

  it('cannot create a well without coordinates', () => {
    const merged = mergeWell(null, parsedWell([row('2026-01-01', 1)], false), NOW);

    expect(merged.well).toBeNull();
    expect(merged.addedRows).toBe(0);
  });
});
