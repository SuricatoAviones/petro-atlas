import { describe, expect, it } from 'vitest';

import {
  exceedsSoftLimits,
  parseProductionCsv,
  splitCsv,
  wellSlug,
  type CsvImportResult,
} from './csv-import';

const HEADER = 'well,date,lat,lon,oil_sm3,gas_sm3,water_sm3,on_stream_h,bhp_bar,whp_bar,choke_pct';

/** The example of docs/09. */
const DOCS_EXAMPLE = `${HEADER}
P-01,2026-10-21,9.7421,-63.1802,294.1,45600,50.9,24,182.4,31.6,48
P-01,2026-10-22,,,291.8,45100,51.7,24,181.9,31.4,48
P-02,2026-10-21,9.7388,-63.1755,65.2,13300,30.2,22.5,,,
`;

function parse(text: string, fieldUnits = false): CsvImportResult {
  return parseProductionCsv(text, { fieldUnits });
}

function errorsOf(result: CsvImportResult): [number, string, string | null][] {
  return result.errors.map((error) => [error.line, error.code, error.column]);
}

describe('splitCsv', () => {
  it('splits records and keeps the line of each one', () => {
    expect(splitCsv('a,b\r\n1,2\n\n3,4', ',')).toEqual([
      { line: 1, cells: ['a', 'b'] },
      { line: 2, cells: ['1', '2'] },
      { line: 4, cells: ['3', '4'] },
    ]);
  });

  it('honours quotes around delimiters, quotes and line breaks', () => {
    expect(splitCsv('"a,b","say ""hi""","two\nlines"\nnext', ',')).toEqual([
      { line: 1, cells: ['a,b', 'say "hi"', 'two\nlines'] },
      { line: 3, cells: ['next'] },
    ]);
  });
});

describe('wellSlug', () => {
  it('follows the slug rule of the database', () => {
    expect(wellSlug(' 15/9-F-12 ')).toBe('15-9-F-12');
    expect(wellSlug('Pozo  Norte 3')).toBe('Pozo-Norte-3');
  });
});

describe('parseProductionCsv', () => {
  it('reads the example of the documentation', () => {
    const result = parse(DOCS_EXAMPLE);

    expect(result.fatal).toBeNull();
    expect(result).toMatchObject({ totalRows: 3, validRows: 3, errorCount: 0 });
    expect(result.wells.map((well) => [well.name, well.rows.length])).toEqual([
      ['P-01', 2],
      ['P-02', 1],
    ]);
    expect(result.wells[0]).toMatchObject({ slug: 'P-01', latDeg: 9.7421, lonDeg: -63.1802 });
    expect(result.wells[0]?.rows[0]).toEqual({
      date: '2026-10-21',
      oilSm3: 294.1,
      gasSm3: 45600,
      waterSm3: 50.9,
      onStreamH: 24,
      bhpBar: 182.4,
      whpBar: 31.6,
      chokePct: 48,
    });
    // An empty cell is a missing value, never zero.
    expect(result.wells[1]?.rows[0]).toMatchObject({ bhpBar: null, whpBar: null, chokePct: null });
  });

  it('accepts a byte order mark, any column order, upper case and extra columns', () => {
    const result = parse('﻿Date,WELL,Lon,Lat,Oil_Sm3,comment\n2026-01-01,A,10,20,5,ok\n');

    expect(result.fatal).toBeNull();
    expect(result.wells[0]).toMatchObject({ name: 'A', latDeg: 20, lonDeg: 10 });
    expect(result.wells[0]?.rows[0]).toMatchObject({ oilSm3: 5, gasSm3: null, onStreamH: 24 });
  });

  it('accepts semicolons as delimiter', () => {
    const result = parse('well;date;lat;lon;oil_sm3\nA;2026-01-01;1;2;3.5\n');

    expect(result.validRows).toBe(1);
    expect(result.wells[0]?.rows[0]?.oilSm3).toBe(3.5);
  });

  it('converts oilfield units to SI when asked', () => {
    const result = parse(
      `${HEADER}\nA,2026-01-01,1,2,628.98,35.3147,62.898,24,1450.38,145.038,50\n`,
      true,
    );
    const row = result.wells[0]?.rows[0];

    expect(row?.oilSm3).toBeCloseTo(100, 6); // 628.98 bbl
    expect(row?.gasSm3).toBeCloseTo(1000, 6); // 35.3147 Mscf
    expect(row?.waterSm3).toBeCloseTo(10, 6);
    expect(row?.bhpBar).toBeCloseTo(100, 3); // 1450.38 psi
    expect(row?.whpBar).toBeCloseTo(10, 3);
    expect(row?.chokePct).toBe(50);
    expect(row?.onStreamH).toBe(24);
  });

  it('reports invalid rows line by line and still loads the valid ones', () => {
    const result = parse(
      [
        HEADER,
        'A,2026-01-01,1,2,10,,,,,,', // 2: valid
        ',2026-01-02,1,2,10,,,,,,', // 3: no well
        'A,02/01/2026,,,10,,,,,,', // 4: invalid date
        'A,2026-02-30,,,10,,,,,,', // 5: date that does not exist
        'A,2026-01-03,,,abc,,,,,,', // 6: not a number
        'A,2026-01-04,,,-1,,,,,,', // 7: negative volume
        'A,2026-01-05,,,,,,,,,', // 8: no volume
        'A,2026-01-06,,,10,,,25,,,', // 9: hours out of range
        'A,2026-01-01,,,11,,,,,,', // 10: duplicate date
        'A,2026-01-07,,,1e2,,,,,,', // 11: valid, scientific notation
        'A,2026-01-08,,,10,,,,,,,extra', // 12: too many cells
        'A,2026-01-09,,,0x10,,,,,,', // 13: hexadecimal is not accepted
      ].join('\n'),
    );

    expect(result.totalRows).toBe(12);
    expect(result.validRows).toBe(2);
    expect(result.errorCount).toBe(10);
    expect(errorsOf(result)).toEqual([
      [3, 'well_required', 'well'],
      [4, 'invalid_date', 'date'],
      [5, 'invalid_date', 'date'],
      [6, 'not_a_number', 'oil_sm3'],
      [7, 'negative', 'oil_sm3'],
      [8, 'no_volume', 'oil_sm3'],
      [9, 'on_stream_out_of_range', 'on_stream_h'],
      [10, 'duplicate_date', 'date'],
      [12, 'column_count', null],
      [13, 'not_a_number', 'oil_sm3'],
    ]);
    expect(result.wells[0]?.rows.map((row) => row.oilSm3)).toEqual([10, 100]);
  });

  it('requires coordinates in the first row of each new well', () => {
    const text = `${HEADER}\nA,2026-01-01,,,10,,,,,,\nA,2026-01-02,95,2,10,,,,,,\nA,2026-01-03,1,2,10,,,,,,\nA,2026-01-04,,,10,,,,,,\n`;
    const result = parse(text);

    expect(errorsOf(result)).toEqual([
      [2, 'coordinates_required', 'lat'],
      [3, 'lat_out_of_range', 'lat'],
    ]);
    expect(result.wells[0]).toMatchObject({ latDeg: 1, lonDeg: 2 });
    expect(result.wells[0]?.rows).toHaveLength(2);
  });

  it('lets a well that is already stored omit its coordinates', () => {
    const result = parseProductionCsv(`${HEADER}\nA,2026-01-01,,,10,,,,,,\n`, {
      fieldUnits: false,
      knownWellSlugs: new Set(['A']),
    });

    expect(result.errorCount).toBe(0);
    expect(result.wells[0]).toMatchObject({ latDeg: null, lonDeg: null });
  });

  it('rejects a well name longer than 64 characters', () => {
    const result = parse(`${HEADER}\n${'x'.repeat(65)},2026-01-01,1,2,10,,,,,,\n`);

    expect(errorsOf(result)).toEqual([[2, 'well_too_long', 'well']]);
  });

  it('keeps text that looks like markup as plain text', () => {
    const result = parse(`${HEADER}\n"<img src=x onerror=alert(1)>",2026-01-01,1,2,10,,,,,,\n`);

    expect(result.wells[0]?.name).toBe('<img src=x onerror=alert(1)>');
  });

  it('stops on a file without header, required columns or volume columns', () => {
    expect(parse('').fatal).toEqual({ code: 'empty' });
    expect(parse('\n\n').fatal).toEqual({ code: 'empty' });
    expect(parse('name,day,oil_sm3\nA,2026-01-01,1\n').fatal).toEqual({
      code: 'missing_columns',
      columns: ['well', 'date'],
    });
    expect(parse('well,date,lat,lon,bhp_bar\nA,2026-01-01,1,2,100\n').fatal).toEqual({
      code: 'no_volume_column',
    });
  });

  it('caps the reported errors but counts them all', () => {
    const rows = Array.from({ length: 600 }, () => 'A,not-a-date,1,2,10');
    const result = parse(`well,date,lat,lon,oil_sm3\n${rows.join('\n')}\n`);

    expect(result.errorCount).toBe(600);
    expect(result.errors).toHaveLength(500);
  });
});

describe('exceedsSoftLimits', () => {
  it('flags more than 50 wells', () => {
    const rows = Array.from({ length: 51 }, (_, index) => `W-${String(index)},2026-01-01,1,2,10`);
    const many = parse(`well,date,lat,lon,oil_sm3\n${rows.join('\n')}\n`);

    expect(exceedsSoftLimits(many)).toBe(true);
    expect(exceedsSoftLimits(parse(DOCS_EXAMPLE))).toBe(false);
  });
});
