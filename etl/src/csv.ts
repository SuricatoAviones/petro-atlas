/** One CSV row keyed by column name. */
export type CsvRecord = Record<string, string>;

export interface CsvTable {
  columns: string[];
  records: CsvRecord[];
}

/**
 * Parses RFC 4180 CSV text: quoted fields, doubled quotes, commas and line breaks inside quotes,
 * CRLF or LF line endings and an optional byte order mark. Empty lines are skipped.
 */
export function parseCsv(text: string): CsvTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;
  const content = text.startsWith('﻿') ? text.slice(1) : text;

  const endRow = (): void => {
    row.push(cell);
    cell = '';
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let index = 0; index < content.length; index += 1) {
    const char = content.charAt(index);
    if (insideQuotes) {
      if (char !== '"') {
        cell += char;
      } else if (content.charAt(index + 1) === '"') {
        cell += '"';
        index += 1;
      } else {
        insideQuotes = false;
      }
    } else if (char === '"') {
      insideQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      endRow();
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) endRow();

  const [columns = [], ...dataRows] = rows;
  const records = dataRows.map((dataRow) =>
    Object.fromEntries(columns.map((column, index) => [column, dataRow[index] ?? ''])),
  );
  return { columns, records };
}

/** Fails early, with the missing names, when a source changes its export format. */
export function requireColumns(table: CsvTable, required: readonly string[], file: string): void {
  const missing = required.filter((column) => !table.columns.includes(column));
  if (missing.length > 0) {
    throw new Error(`${file} is missing the columns: ${missing.join(', ')}`);
  }
}
