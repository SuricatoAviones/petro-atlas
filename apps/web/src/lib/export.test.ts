import { describe, expect, it } from 'vitest';

import { safeFileName, toCsv } from './export';

describe('toCsv', () => {
  it('writes a header and rows with CRLF and empty cells for null', () => {
    expect(
      toCsv({
        headers: ['date', 'oil', 'note'],
        rows: [
          ['2026-01-01', 12.5, null],
          ['2026-01-02', 0, 'sin dato'],
        ],
      }),
    ).toBe('date,oil,note\r\n2026-01-01,12.5,\r\n2026-01-02,0,sin dato\r\n');
  });

  it('quotes delimiters, quotes and line breaks', () => {
    expect(toCsv({ headers: ['a'], rows: [['x,y'], ['say "hi"'], ['two\nlines']] })).toBe(
      'a\r\n"x,y"\r\n"say ""hi"""\r\n"two\nlines"\r\n',
    );
  });

  it('prefixes text that a spreadsheet would run as a formula', () => {
    expect(toCsv({ headers: ['value'], rows: [['=1+1'], ['+1'], ['-1'], ['@x']] })).toBe(
      "value\r\n'=1+1\r\n'+1\r\n'-1\r\n'@x\r\n",
    );
  });
});

describe('safeFileName', () => {
  it('removes accents, spaces and path characters', () => {
    expect(safeFileName('Tasas de producción / 2026')).toBe('tasas-de-produccion-2026');
  });

  it('falls back to a fixed name', () => {
    expect(safeFileName('///')).toBe('petroatlas');
  });
});
