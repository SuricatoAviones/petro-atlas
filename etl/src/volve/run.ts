/**
 * Volve ETL: validate the downloaded inputs, normalize them and load daily production, monthly
 * field production and trajectories. Run `pnpm etl:volve` after `pnpm etl:sodir`.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { readSheet, type CellValue, type Row } from 'read-excel-file/node';

import {
  VOLVE_DATA_DIR,
  VOLVE_PRODUCTION_FILE,
  VOLVE_SOURCE,
  VOLVE_TRAJECTORY_DIR,
  prepareVolveFiles,
} from './files.ts';
import { getKnownWells, loadVolve } from './load.ts';
import {
  normalizeMonthlyFieldProduction,
  normalizeProduction,
  normalizeTrajectories,
  type VolveRecord,
} from './normalize.ts';
import { readTrajectories } from './trajectories.ts';

const DAILY_SHEET = 'Daily Production Data';
const MONTHLY_SHEET = 'Monthly Production Data';

/** Converts a sheet to records keyed by its header row, dropping empty rows. */
function sheetToRecords(rows: readonly Row[]): VolveRecord[] {
  const [header, ...dataRows] = rows;
  if (header === undefined) return [];
  const names = header.map((cell) => (typeof cell === 'string' ? cell.trim() : ''));
  return dataRows.flatMap((row) => {
    const record: Record<string, CellValue | null> = {};
    for (const [index, name] of names.entries()) {
      if (name !== '') record[name] = row[index] ?? null;
    }
    return Object.values(record).some((value) => value !== null && value !== '') ? [record] : [];
  });
}

async function main(): Promise<void> {
  const connectionString = process.env.ETL_DATABASE_URL;
  if (connectionString === undefined || connectionString === '') {
    throw new Error('Missing environment variable ETL_DATABASE_URL. See .env.example.');
  }

  await prepareVolveFiles();
  const knownWells = await getKnownWells(connectionString);
  if (knownWells.size === 0) {
    throw new Error('No Sodir wells found for VOLVE; run pnpm etl:sodir first');
  }

  const workbook = fileURLToPath(new URL(VOLVE_PRODUCTION_FILE, VOLVE_DATA_DIR));
  const dailyRecords = sheetToRecords(await readSheet(workbook, DAILY_SHEET));
  const monthlyRecords = sheetToRecords(await readSheet(workbook, MONTHLY_SHEET));
  const knownNames = new Set(knownWells.keys());

  const daily = normalizeProduction(dailyRecords, knownNames);
  const monthly = normalizeMonthlyFieldProduction(monthlyRecords, knownNames);
  const trajectories = normalizeTrajectories(
    await readTrajectories(new URL(VOLVE_TRAJECTORY_DIR, VOLVE_DATA_DIR)),
    knownNames,
  );

  const loaded = await loadVolve(
    connectionString,
    knownWells,
    daily.records,
    monthly.records,
    trajectories.records,
  );

  const report = {
    source: VOLVE_SOURCE.name,
    finishedAt: new Date().toISOString(),
    productionDaily: daily.report,
    fieldMonthly: monthly.report,
    trajectories: trajectories.report,
    loaded,
  };
  await writeFile(new URL('report.json', VOLVE_DATA_DIR), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

await main();
