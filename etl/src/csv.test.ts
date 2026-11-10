import { describe, expect, it } from 'vitest';

import { parseCsv, requireColumns } from './csv.ts';

describe('parseCsv', () => {
  it('parses a header and rows, skipping the byte order mark and empty lines', () => {
    const table = parseCsv('﻿name,depth\r\nA-1,100\r\n\r\nA-2,\r\n');

    expect(table.columns).toEqual(['name', 'depth']);
    expect(table.records).toEqual([
      { name: 'A-1', depth: '100' },
      { name: 'A-2', depth: '' },
    ]);
  });

  it('handles quotes, escaped quotes, commas and line breaks inside a field', () => {
    const table = parseCsv('name,note\n"A, B","said ""hi""\nsecond line"\n');

    expect(table.records).toEqual([{ name: 'A, B', note: 'said "hi"\nsecond line' }]);
  });

  it('fills missing trailing cells with an empty string', () => {
    expect(parseCsv('a,b,c\n1').records).toEqual([{ a: '1', b: '', c: '' }]);
  });
});

describe('requireColumns', () => {
  it('names the missing columns', () => {
    const table = parseCsv('a,b\n1,2');

    expect(() => {
      requireColumns(table, ['a', 'c', 'd'], 'wells.csv');
    }).toThrow('wells.csv is missing the columns: c, d');
    expect(() => {
      requireColumns(table, ['a', 'b'], 'wells.csv');
    }).not.toThrow();
  });
});
