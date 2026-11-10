/** CSV output for the export route (RFC 4180, with a guard against spreadsheet formulas). */

const NEEDS_QUOTES = /[",\r\n]/;
/** A text cell starting with one of these is run as a formula by spreadsheet programs. */
const FORMULA_START = /^[=+\-@\t\r]/;

export type CsvCell = string | number | null;

/** One cell: numbers as they are, a missing value as an empty cell, text quoted when needed. */
export function csvCell(value: CsvCell): string {
  if (value === null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvRow(cells: readonly CsvCell[]): string {
  return `${cells.map(csvCell).join(',')}\r\n`;
}
