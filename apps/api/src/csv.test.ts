import { describe, expect, it } from 'vitest';

import { csvCell, csvRow } from './csv.ts';

describe('csvCell', () => {
  it('writes numbers as they are and a missing value as an empty cell', () => {
    expect(csvCell(294.1)).toBe('294.1');
    expect(csvCell(0)).toBe('0');
    expect(csvCell(-3.5)).toBe('-3.5');
    expect(csvCell(null)).toBe('');
    expect(csvCell(Number.NaN)).toBe('');
  });

  it('quotes text with commas, quotes or line breaks', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('neutralizes text that a spreadsheet would run as a formula', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });
});

describe('csvRow', () => {
  it('joins the cells and ends the row with CRLF', () => {
    expect(csvRow(['P-01', '2026-10-21', 294.1, null])).toBe('P-01,2026-10-21,294.1,\r\n');
  });
});
