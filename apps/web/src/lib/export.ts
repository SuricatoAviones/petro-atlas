/** CSV and PNG downloads built in the browser (RF-12; docs/07, rule 12). */

export type TableCell = string | number | null;

export interface TableData {
  headers: readonly string[];
  rows: readonly (readonly TableCell[])[];
}

const NEEDS_QUOTES = /[",\r\n]/;
/** A text cell starting with one of these is run as a formula by spreadsheet programs. */
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value: TableCell): string {
  if (value === null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** RFC 4180 text. Numbers keep the dot as decimal separator; a missing value is an empty cell. */
export function toCsv(table: TableData): string {
  return [table.headers, ...table.rows].map((row) => `${row.map(csvCell).join(',')}\r\n`).join('');
}

/** A file name from free text: lower case, without accents, spaces or path characters. */
export function safeFileName(text: string): string {
  const name = text
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return name === '' ? 'petroatlas' : name;
}

function clickDownload(href: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
}

/** The BOM makes spreadsheet programs read the file as UTF-8. */
export function downloadCsv(fileName: string, table: TableData): void {
  const blob = new Blob(['﻿', toCsv(table)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  clickDownload(url, fileName);
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(fileName: string, dataUrl: string): void {
  clickDownload(dataUrl, fileName);
}
