/**
 * Download stage: fetches the Sodir exports into data/sodir, which Git ignores (docs/10).
 * Nothing is parsed here, so a later stage can be rerun without downloading again.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const TABLE_VIEW_URL = 'https://factpages.sodir.no/public?/Factpages/external/tableview/';
const CSV_EXPORT_QUERY =
  '&rs:Command=Render&rc:Toolbar=false&rc:Parameters=f&IpAddress=not_used&CultureCode=en&rs:Format=CSV&Top100=false';
// Field outlines, layer 7100 of Sodir's public feature service, kept in ED50 like the wellbores.
const FIELD_OUTLINES_URL =
  'https://factmaps.sodir.no/api/rest/services/DataService/Data/FeatureServer/7100/query' +
  '?where=1%3D1&outFields=fldNpdidField&outSR=4230&f=geojson';

export const SODIR_DATA_DIR = new URL('../../../data/sodir/', import.meta.url);

export const SODIR_FILES = {
  explorationWellbores: 'wellbore_exploration_all.csv',
  developmentWellbores: 'wellbore_development_all.csv',
  fields: 'field.csv',
  fieldOutlines: 'field_outlines.geojson',
} as const;

async function download(url: string, fileName: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`Download of ${fileName} failed with HTTP ${String(response.status)}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length === 0) throw new Error(`Download of ${fileName} returned an empty file`);
  await writeFile(new URL(fileName, SODIR_DATA_DIR), body);
  console.log(`Downloaded ${fileName} (${String(Math.round(body.length / 1024))} KiB)`);
}

export async function downloadSodir(): Promise<void> {
  await mkdir(SODIR_DATA_DIR, { recursive: true });
  const tableUrl = (table: string): string => `${TABLE_VIEW_URL}${table}${CSV_EXPORT_QUERY}`;
  await download(tableUrl('wellbore_exploration_all'), SODIR_FILES.explorationWellbores);
  await download(tableUrl('wellbore_development_all'), SODIR_FILES.developmentWellbores);
  await download(tableUrl('field'), SODIR_FILES.fields);
  await download(FIELD_OUTLINES_URL, SODIR_FILES.fieldOutlines);
}
