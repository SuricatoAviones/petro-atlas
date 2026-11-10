/**
 * Sodir ETL: download, validate, normalize and load, as separate stages (`pnpm etl:sodir`).
 * Pass `--skip-download` to reuse the files already in data/sodir.
 */
import { readFile, writeFile } from 'node:fs/promises';

import { parseCsv, requireColumns, type CsvRecord } from '../csv.ts';
import { SODIR_DATA_DIR, SODIR_FILES, downloadSodir } from './download.ts';
import { loadSodir } from './load.ts';
import {
  FIELD_COLUMNS,
  WELLBORE_COLUMNS,
  fieldOutlinesSchema,
  normalizeFields,
  normalizeWells,
} from './normalize.ts';

async function readDataFile(fileName: string): Promise<string> {
  return readFile(new URL(fileName, SODIR_DATA_DIR), 'utf8');
}

async function readCsvRecords(fileName: string, columns: readonly string[]): Promise<CsvRecord[]> {
  const table = parseCsv(await readDataFile(fileName));
  requireColumns(table, columns, fileName);
  return table.records;
}

async function main(): Promise<void> {
  const connectionString = process.env.ETL_DATABASE_URL;
  if (connectionString === undefined || connectionString === '') {
    throw new Error('Missing environment variable ETL_DATABASE_URL. See .env.example.');
  }
  if (!process.argv.includes('--skip-download')) await downloadSodir();

  const explorationRecords = await readCsvRecords(
    SODIR_FILES.explorationWellbores,
    WELLBORE_COLUMNS,
  );
  const developmentRecords = await readCsvRecords(
    SODIR_FILES.developmentWellbores,
    WELLBORE_COLUMNS,
  );
  const fieldRecords = await readCsvRecords(SODIR_FILES.fields, FIELD_COLUMNS);
  const outlines = fieldOutlinesSchema.parse(
    JSON.parse(await readDataFile(SODIR_FILES.fieldOutlines)),
  );

  const { fields, report: fieldReport } = normalizeFields(fieldRecords, outlines);
  const { wells, report: wellReport } = normalizeWells(explorationRecords, developmentRecords);
  const knownFieldNames = new Set(fields.map((field) => field.name));
  const wellsWithUnknownField = wells.filter(
    (well) => well.fieldName !== null && !knownFieldNames.has(well.fieldName),
  ).length;

  await loadSodir(connectionString, fields, wells);

  const report = {
    source: 'Sodir FactPages',
    finishedAt: new Date().toISOString(),
    fields: {
      ...fieldReport,
      withoutOutline: fields.filter((f) => f.boundaryEd50 === null).length,
    },
    wells: { ...wellReport, withUnknownField: wellsWithUnknownField },
  };
  await writeFile(new URL('report.json', SODIR_DATA_DIR), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

await main();
