/**
 * Volve data files. Equinor now distributes the dataset through the Databricks Marketplace,
 * which needs an authenticated download, so the ETL reads the production workbook and the
 * trajectory XML files from `data/volve/`. A direct URL can be provided in
 * `VOLVE_PRODUCTION_URL` to download the workbook in the download stage.
 */
import { access, mkdir, readdir, writeFile } from 'node:fs/promises';

export const VOLVE_DATA_DIR = new URL('../../../data/volve/', import.meta.url);
export const VOLVE_PRODUCTION_FILE = 'Volve production data.xlsx';
export const VOLVE_TRAJECTORY_DIR = 'trajectories/';

export const VOLVE_SOURCE = {
  name: 'Volve (Equinor)',
  license: 'Equinor Open Data Licence: attribution required, not for resale',
  url: 'https://www.equinor.com/energy/volve-data-sharing',
} as const;

async function exists(url: URL): Promise<boolean> {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

async function download(url: string, target: URL): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(
      `Download of the Volve production workbook failed with HTTP ${String(response.status)}`,
    );
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length === 0)
    throw new Error('Download of the Volve production workbook returned an empty file');
  await writeFile(target, body);
  console.log(
    `Downloaded ${VOLVE_PRODUCTION_FILE} (${String(Math.round(body.length / 1024))} KiB)`,
  );
}

/** Validates that the two inputs exist, downloading the workbook when a direct URL is set. */
export async function prepareVolveFiles(): Promise<void> {
  await mkdir(VOLVE_DATA_DIR, { recursive: true });
  await mkdir(new URL(VOLVE_TRAJECTORY_DIR, VOLVE_DATA_DIR), { recursive: true });

  const production = new URL(VOLVE_PRODUCTION_FILE, VOLVE_DATA_DIR);
  if (!(await exists(production))) {
    const url = process.env.VOLVE_PRODUCTION_URL;
    if (url === undefined || url === '') {
      throw new Error(
        `Missing ${VOLVE_PRODUCTION_FILE} in ${VOLVE_DATA_DIR.pathname}. ` +
          'Download the Volve dataset from Equinor (Databricks Marketplace), place the workbook ' +
          'in data/volve/ and the trajectory XML files in data/volve/trajectories/. ' +
          'Alternatively set VOLVE_PRODUCTION_URL to a direct download URL.',
      );
    }
    await download(url, production);
  }

  const trajectories = await readdir(new URL(VOLVE_TRAJECTORY_DIR, VOLVE_DATA_DIR));
  if (!trajectories.some((name) => name.toLowerCase().endsWith('.xml'))) {
    throw new Error(
      `No trajectory XML files found in ${new URL(VOLVE_TRAJECTORY_DIR, VOLVE_DATA_DIR).pathname}. ` +
        'Download the trajectories from the Volve dataset and place them there.',
    );
  }
}
