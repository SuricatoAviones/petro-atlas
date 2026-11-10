/**
 * Wells imported from CSV, kept in IndexedDB (RF-14; docs/09; ADR 0002). They never leave the
 * browser: there is no upload, and the API stays read-only.
 *
 * Each well is one record with its series in columns, the same layout the API uses for the
 * public wells, so the charts do not care where a series comes from.
 */
import { z } from 'zod';

import type { ParsedWell } from './csv-import';

const DATABASE_NAME = 'petroatlas';
const DATABASE_VERSION = 1;
const STORE_NAME = 'imported-wells';

const nullableSeries = z.array(z.number().nullable());

/** What is read back from IndexedDB is validated like any other input (docs/12). */
const importedWellSchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1).max(64),
    latDeg: z.number().min(-90).max(90),
    lonDeg: z.number().min(-180).max(180),
    /** ISO timestamp of the first import of this well. */
    importedAt: z.string(),
    /** ISO dates in ascending order. */
    dates: z.array(z.iso.date()),
    series: z.object({
      oil: nullableSeries,
      gas: nullableSeries,
      water: nullableSeries,
      onStream: nullableSeries,
      bhp: nullableSeries,
      whp: nullableSeries,
      choke: nullableSeries,
    }),
  })
  .refine((well) =>
    Object.values(well.series).every((values) => values.length === well.dates.length),
  );

export type ImportedWell = z.infer<typeof importedWellSchema>;

export interface ImportSummary {
  /** Wells that received at least one new day. */
  wells: number;
  addedRows: number;
  /** Days already stored for their well, left untouched (docs/09). */
  skippedRows: number;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    };
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser'));
  }
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'slug' });
    }
  };
  return requestResult(request);
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const done = transactionDone(transaction);
    const result = await run(transaction.objectStore(STORE_NAME));
    await done;
    return result;
  } finally {
    database.close();
  }
}

function parseStored(records: readonly unknown[]): ImportedWell[] {
  // A record that no longer matches the schema is ignored instead of breaking the page.
  return records.flatMap((record) => {
    const parsed = importedWellSchema.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Every imported well, ordered by name. */
export async function listImportedWells(): Promise<ImportedWell[]> {
  const records = await withStore('readonly', (store) => requestResult<unknown[]>(store.getAll()));
  return parseStored(records).sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

/** Adds the new days of `parsed` to `existing`, keeping the dates sorted. */
export function mergeWell(
  existing: ImportedWell | null,
  parsed: ParsedWell,
  importedAt: string,
): { well: ImportedWell | null; addedRows: number; skippedRows: number } {
  const known = new Set(existing?.dates ?? []);
  const newRows = parsed.rows.filter((row) => !known.has(row.date));
  const skippedRows = parsed.rows.length - newRows.length;
  const latDeg = existing?.latDeg ?? parsed.latDeg;
  const lonDeg = existing?.lonDeg ?? parsed.lonDeg;
  if (latDeg === null || lonDeg === null) return { well: null, addedRows: 0, skippedRows };
  if (existing !== null && newRows.length === 0)
    return { well: existing, addedRows: 0, skippedRows };

  const rows = [
    ...(existing?.dates ?? []).map((date, index) => ({
      date,
      oilSm3: existing?.series.oil[index] ?? null,
      gasSm3: existing?.series.gas[index] ?? null,
      waterSm3: existing?.series.water[index] ?? null,
      onStreamH: existing?.series.onStream[index] ?? null,
      bhpBar: existing?.series.bhp[index] ?? null,
      whpBar: existing?.series.whp[index] ?? null,
      chokePct: existing?.series.choke[index] ?? null,
    })),
    ...newRows,
  ].sort((left, right) => left.date.localeCompare(right.date));

  return {
    well: {
      slug: parsed.slug,
      name: existing?.name ?? parsed.name,
      latDeg,
      lonDeg,
      importedAt: existing?.importedAt ?? importedAt,
      dates: rows.map((row) => row.date),
      series: {
        oil: rows.map((row) => row.oilSm3),
        gas: rows.map((row) => row.gasSm3),
        water: rows.map((row) => row.waterSm3),
        onStream: rows.map((row) => row.onStreamH),
        bhp: rows.map((row) => row.bhpBar),
        whp: rows.map((row) => row.whpBar),
        choke: rows.map((row) => row.chokePct),
      },
    },
    addedRows: newRows.length,
    skippedRows,
  };
}

/** Stores the parsed wells. Days already stored for a well are skipped, so re-importing is safe. */
export async function saveImportedWells(parsed: readonly ParsedWell[]): Promise<ImportSummary> {
  const importedAt = new Date().toISOString();
  return withStore('readwrite', async (store) => {
    const summary: ImportSummary = { wells: 0, addedRows: 0, skippedRows: 0 };
    for (const parsedWell of parsed) {
      const stored = parseStored([await requestResult<unknown>(store.get(parsedWell.slug))]);
      const merged = mergeWell(stored[0] ?? null, parsedWell, importedAt);
      summary.skippedRows += merged.skippedRows;
      if (merged.well === null || merged.addedRows === 0) continue;
      await requestResult(store.put(merged.well));
      summary.wells += 1;
      summary.addedRows += merged.addedRows;
    }
    return summary;
  });
}

export async function deleteImportedWell(slug: string): Promise<void> {
  await withStore('readwrite', (store) => requestResult(store.delete(slug)));
}

export async function clearImportedWells(): Promise<void> {
  await withStore('readwrite', (store) => requestResult(store.clear()));
}
