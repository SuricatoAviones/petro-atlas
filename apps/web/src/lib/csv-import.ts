/**
 * Parser and validator of the production CSV a visitor imports (RF-14; docs/09, "Importación
 * CSV"). The file is untrusted input: every row is validated, invalid rows are reported with
 * their line and the valid ones are kept. Nothing here touches the network or the DOM.
 */
import { toSI } from '@petroatlas/petro-calc';
import { z } from 'zod';

/** Files above this size are rejected before reading them. */
export const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024;
/** Soft limits of docs/09: above them the interface asks before continuing. */
export const SOFT_WELL_LIMIT = 50;
export const SOFT_ROW_LIMIT = 200_000;
/** Row errors kept for display; the rest are only counted. */
export const MAX_REPORTED_ERRORS = 500;

const VOLUME_COLUMNS = ['oil_sm3', 'gas_sm3', 'water_sm3'] as const;
const OPTIONAL_COLUMNS = [
  'lat',
  'lon',
  ...VOLUME_COLUMNS,
  'on_stream_h',
  'bhp_bar',
  'whp_bar',
  'choke_pct',
] as const;
const REQUIRED_COLUMNS = ['well', 'date'] as const;

export type CsvColumn = (typeof REQUIRED_COLUMNS)[number] | (typeof OPTIONAL_COLUMNS)[number];

export type CsvRowErrorCode =
  | 'well_required'
  | 'well_too_long'
  | 'invalid_date'
  | 'not_a_number'
  | 'negative'
  | 'lat_out_of_range'
  | 'lon_out_of_range'
  | 'on_stream_out_of_range'
  | 'no_volume'
  | 'coordinates_required'
  | 'duplicate_date'
  | 'column_count';

export interface CsvRowError {
  /** Line of the file, starting at 1 for the header. */
  line: number;
  code: CsvRowErrorCode;
  column: CsvColumn | null;
}

export type CsvFatalError =
  { code: 'empty' } | { code: 'missing_columns'; columns: string[] } | { code: 'no_volume_column' };

export interface ImportedRow {
  date: string;
  oilSm3: number | null;
  gasSm3: number | null;
  waterSm3: number | null;
  onStreamH: number;
  bhpBar: number | null;
  whpBar: number | null;
  chokePct: number | null;
}

export interface ParsedWell {
  name: string;
  slug: string;
  /** Null only for a well that is already stored and whose rows bring no coordinates. */
  latDeg: number | null;
  lonDeg: number | null;
  rows: ImportedRow[];
}

export interface CsvImportResult {
  fatal: CsvFatalError | null;
  wells: ParsedWell[];
  /** Data rows read, valid or not. */
  totalRows: number;
  validRows: number;
  /** First {@link MAX_REPORTED_ERRORS} row errors, in file order. */
  errors: CsvRowError[];
  errorCount: number;
}

export interface CsvImportOptions {
  /** The file is in oilfield units: bbl, Mscf and psi. Converted to SI here. */
  fieldUnits: boolean;
  /** Slugs of wells already stored: their rows may omit the coordinates. */
  knownWellSlugs?: ReadonlySet<string>;
}

/** Same rule as the database slug (db/migrations/0002_slugs.sql). */
export function wellSlug(name: string): string {
  return name.trim().replaceAll(/[/\s]+/g, '-');
}

const NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function code(value: CsvRowErrorCode): CsvRowErrorCode {
  return value;
}

/** An empty cell is a missing value; anything else must be a plain decimal number. */
const optionalNumber = z.string().transform((text, context): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!NUMBER_PATTERN.test(trimmed) || !Number.isFinite(Number(trimmed))) {
    context.issues.push({ code: 'custom', message: code('not_a_number'), input: text });
    return z.NEVER;
  }
  return Number(trimmed);
});

const volume = optionalNumber.refine((value) => value === null || value >= 0, code('negative'));

const rowSchema = z
  .object({
    well: z.string().trim().min(1, code('well_required')).max(64, code('well_too_long')),
    date: z.string().trim().refine(isIsoDate, code('invalid_date')),
    lat: optionalNumber.refine(
      (value) => value === null || (value >= -90 && value <= 90),
      code('lat_out_of_range'),
    ),
    lon: optionalNumber.refine(
      (value) => value === null || (value >= -180 && value <= 180),
      code('lon_out_of_range'),
    ),
    oil_sm3: volume,
    gas_sm3: volume,
    water_sm3: volume,
    on_stream_h: optionalNumber.refine(
      (value) => value === null || (value >= 0 && value <= 24),
      code('on_stream_out_of_range'),
    ),
    bhp_bar: optionalNumber,
    whp_bar: optionalNumber,
    choke_pct: optionalNumber,
  })
  .refine((row) => row.oil_sm3 !== null || row.gas_sm3 !== null || row.water_sm3 !== null, {
    message: code('no_volume'),
    path: ['oil_sm3'],
  });

const ROW_ERROR_CODES: ReadonlySet<string> = new Set<CsvRowErrorCode>([
  'well_required',
  'well_too_long',
  'invalid_date',
  'not_a_number',
  'negative',
  'lat_out_of_range',
  'lon_out_of_range',
  'on_stream_out_of_range',
  'no_volume',
]);

function isRowErrorCode(value: string): value is CsvRowErrorCode {
  return ROW_ERROR_CODES.has(value);
}

function isCsvColumn(value: unknown): value is CsvColumn {
  return (
    typeof value === 'string' &&
    ([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as readonly string[]).includes(value)
  );
}

interface CsvRecord {
  line: number;
  cells: string[];
}

/** Splits CSV text into records, honouring quoted cells that hold delimiters or line breaks. */
export function splitCsv(text: string, delimiter: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  const endRecord = (): void => {
    cells.push(cell);
    // A line with nothing in it is skipped, not reported.
    if (cells.length > 1 || cells[0]?.trim() !== '') records.push({ line: recordLine, cells });
    cells = [];
    cell = '';
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') line += 1;
        cell += char;
      }
    } else if (char === '"' && cell === '') {
      inQuotes = true;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      endRecord();
      line += 1;
      recordLine = line;
    } else {
      cell += char;
    }
  }
  if (cell !== '' || cells.length > 0) endRecord();
  return records;
}

function toSiRow(row: z.output<typeof rowSchema>, fieldUnits: boolean): Omit<ImportedRow, 'date'> {
  const liquid = (value: number | null): number | null =>
    value === null || !fieldUnits ? value : toSI(value, 'liquidVolume');
  // Gas comes in thousands of standard cubic feet.
  const gas = (value: number | null): number | null =>
    value === null || !fieldUnits ? value : toSI(value * 1000, 'gasVolume');
  const pressure = (value: number | null): number | null =>
    value === null || !fieldUnits ? value : toSI(value, 'pressure');
  return {
    oilSm3: liquid(row.oil_sm3),
    gasSm3: gas(row.gas_sm3),
    waterSm3: liquid(row.water_sm3),
    onStreamH: row.on_stream_h ?? 24,
    bhpBar: pressure(row.bhp_bar),
    whpBar: pressure(row.whp_bar),
    chokePct: row.choke_pct,
  };
}

/** Parses and validates the CSV text. Invalid rows are reported; valid ones are returned. */
export function parseProductionCsv(text: string, options: CsvImportOptions): CsvImportResult {
  const result: CsvImportResult = {
    fatal: null,
    wells: [],
    totalRows: 0,
    validRows: 0,
    errors: [],
    errorCount: 0,
  };
  const withoutBom = text.startsWith('﻿') ? text.slice(1) : text;
  const headerLine = withoutBom.split(/\r?\n/, 1)[0] ?? '';
  // Spreadsheets in Spanish locales export with semicolons.
  const delimiter = !headerLine.includes(',') && headerLine.includes(';') ? ';' : ',';
  const [header, ...records] = splitCsv(withoutBom, delimiter);
  if (header === undefined) {
    result.fatal = { code: 'empty' };
    return result;
  }

  const columns = header.cells.map((name) => name.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length > 0) {
    result.fatal = { code: 'missing_columns', columns: missing };
    return result;
  }
  if (!VOLUME_COLUMNS.some((name) => columns.includes(name))) {
    result.fatal = { code: 'no_volume_column' };
    return result;
  }
  const indexOf = new Map<string, number>();
  columns.forEach((name, index) => {
    if (!indexOf.has(name)) indexOf.set(name, index);
  });

  const report = (line: number, errorCode: CsvRowErrorCode, column: CsvColumn | null): void => {
    result.errorCount += 1;
    if (result.errors.length < MAX_REPORTED_ERRORS) {
      result.errors.push({ line, code: errorCode, column });
    }
  };

  const wells = new Map<string, ParsedWell>();
  const seenDates = new Map<string, Set<string>>();
  result.totalRows = records.length;

  for (const record of records) {
    if (record.cells.length > columns.length) {
      report(record.line, 'column_count', null);
      continue;
    }
    const raw: Record<string, string> = {};
    for (const name of [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]) {
      const index = indexOf.get(name);
      raw[name] = index === undefined ? '' : (record.cells[index] ?? '');
    }
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const column = issue?.path[0];
      report(
        record.line,
        issue !== undefined && isRowErrorCode(issue.message) ? issue.message : 'not_a_number',
        isCsvColumn(column) ? column : null,
      );
      continue;
    }

    const row = parsed.data;
    const slug = wellSlug(row.well);
    let well = wells.get(slug);
    if (well === undefined) {
      const hasCoordinates = row.lat !== null && row.lon !== null;
      if (!hasCoordinates && options.knownWellSlugs?.has(slug) !== true) {
        report(record.line, 'coordinates_required', row.lat === null ? 'lat' : 'lon');
        continue;
      }
      well = {
        name: row.well,
        slug,
        latDeg: hasCoordinates ? row.lat : null,
        lonDeg: hasCoordinates ? row.lon : null,
        rows: [],
      };
      wells.set(slug, well);
      seenDates.set(slug, new Set());
    }
    const dates = seenDates.get(slug);
    if (dates?.has(row.date) === true) {
      report(record.line, 'duplicate_date', 'date');
      continue;
    }
    dates?.add(row.date);
    well.rows.push({ date: row.date, ...toSiRow(row, options.fieldUnits) });
    result.validRows += 1;
  }

  result.wells = [...wells.values()];
  return result;
}

export function exceedsSoftLimits(result: CsvImportResult): boolean {
  return result.wells.length > SOFT_WELL_LIMIT || result.validRows > SOFT_ROW_LIMIT;
}
