/**
 * Loads the synthetic dataset from generate.ts into the database (`pnpm db:seed`).
 *
 * Idempotent like the ETL (docs/10): upserts keyed on the natural keys, all in one transaction,
 * so running it twice leaves the database unchanged. Connects as petroatlas_etl.
 */
import pg from 'pg';

import { requireEnv } from '../scripts/env.ts';
import { generateSyntheticDataset, type SyntheticDataset } from './generate.ts';

function requireId(rows: { id: number }[], statement: string): number {
  const id = rows[0]?.id;
  if (id === undefined) throw new Error(`${statement} returned no row`);
  return id;
}

async function upsertSource(client: pg.Client, dataset: SyntheticDataset): Promise<number> {
  const { name, license, url } = dataset.source;
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO data_source (name, license, url)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET license = EXCLUDED.license, url = EXCLUDED.url
     RETURNING id`,
    [name, license, url],
  );
  return requireId(rows, 'data_source upsert');
}

/** `field` has no unique key besides its id, so the upsert is a lookup by source and name. */
async function upsertField(
  client: pg.Client,
  sourceId: number,
  dataset: SyntheticDataset,
): Promise<number> {
  const { name, operator, status, boundary } = dataset.field;
  const boundaryGeoJson = JSON.stringify({ type: 'MultiPolygon', coordinates: [[boundary]] });
  const existing = await client.query<{ id: number }>(
    'SELECT id FROM field WHERE source_id = $1 AND name = $2',
    [sourceId, name],
  );
  const existingId = existing.rows[0]?.id;
  if (existingId !== undefined) {
    await client.query(
      `UPDATE field SET operator = $2, status = $3, geom = ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)
       WHERE id = $1`,
      [existingId, operator, status, boundaryGeoJson],
    );
    return existingId;
  }
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO field (source_id, name, operator, status, geom)
     VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))
     RETURNING id`,
    [sourceId, name, operator, status, boundaryGeoJson],
  );
  return requireId(rows, 'field insert');
}

async function upsertWells(
  client: pg.Client,
  sourceId: number,
  fieldId: number,
  dataset: SyntheticDataset,
): Promise<Map<string, number>> {
  const wellIds = new Map<string, number>();
  for (const well of dataset.wells) {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO well
         (field_id, source_id, name, well_type, status, spud_date, total_depth_m, geom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326))
       ON CONFLICT (source_id, name) DO UPDATE SET
         field_id = EXCLUDED.field_id,
         well_type = EXCLUDED.well_type,
         status = EXCLUDED.status,
         spud_date = EXCLUDED.spud_date,
         total_depth_m = EXCLUDED.total_depth_m,
         geom = EXCLUDED.geom
       RETURNING id`,
      [
        fieldId,
        sourceId,
        well.name,
        well.wellType,
        well.status,
        well.spudDate,
        well.totalDepthM,
        well.lon,
        well.lat,
      ],
    );
    wellIds.set(well.name, requireId(rows, `well upsert for ${well.name}`));
  }
  return wellIds;
}

async function upsertProduction(
  client: pg.Client,
  sourceId: number,
  wellIds: Map<string, number>,
  dataset: SyntheticDataset,
): Promise<void> {
  const rows = dataset.production;
  const wellIdOf = (wellName: string): number => {
    const id = wellIds.get(wellName);
    if (id === undefined) throw new Error(`Unknown well ${wellName}`);
    return id;
  };
  // One statement with column arrays; unnest turns them back into rows.
  await client.query(
    `INSERT INTO production_daily
       (well_id, source_id, date, oil_sm3, gas_sm3, water_sm3, water_inj_sm3, on_stream_h,
        bhp_bar, whp_bar, bht_c, wht_c, choke_pct)
     SELECT * FROM unnest(
       $1::int[], $2::int[], $3::date[], $4::real[], $5::real[], $6::real[], $7::real[],
       $8::real[], $9::real[], $10::real[], $11::real[], $12::real[], $13::real[])
     ON CONFLICT (well_id, date) DO UPDATE SET
       source_id = EXCLUDED.source_id,
       oil_sm3 = EXCLUDED.oil_sm3,
       gas_sm3 = EXCLUDED.gas_sm3,
       water_sm3 = EXCLUDED.water_sm3,
       water_inj_sm3 = EXCLUDED.water_inj_sm3,
       on_stream_h = EXCLUDED.on_stream_h,
       bhp_bar = EXCLUDED.bhp_bar,
       whp_bar = EXCLUDED.whp_bar,
       bht_c = EXCLUDED.bht_c,
       wht_c = EXCLUDED.wht_c,
       choke_pct = EXCLUDED.choke_pct`,
    [
      rows.map((row) => wellIdOf(row.wellName)),
      rows.map(() => sourceId),
      rows.map((row) => row.date),
      rows.map((row) => row.oilSm3),
      rows.map((row) => row.gasSm3),
      rows.map((row) => row.waterSm3),
      rows.map((row) => row.waterInjSm3),
      rows.map((row) => row.onStreamH),
      rows.map((row) => row.bhpBar),
      rows.map((row) => row.whpBar),
      rows.map((row) => row.bhtC),
      rows.map((row) => row.whtC),
      rows.map((row) => row.chokePct),
    ],
  );
}

async function upsertFieldProduction(
  client: pg.Client,
  sourceId: number,
  fieldId: number,
  dataset: SyntheticDataset,
): Promise<void> {
  const rows = dataset.fieldProduction;
  await client.query(
    `INSERT INTO field_production_monthly
       (field_id, source_id, month, oil_sm3, gas_sm3, water_sm3)
     SELECT * FROM unnest($1::int[], $2::int[], $3::date[], $4::real[], $5::real[], $6::real[])
     ON CONFLICT (field_id, month) DO UPDATE SET
       source_id = EXCLUDED.source_id,
       oil_sm3 = EXCLUDED.oil_sm3,
       gas_sm3 = EXCLUDED.gas_sm3,
       water_sm3 = EXCLUDED.water_sm3`,
    [
      rows.map(() => fieldId),
      rows.map(() => sourceId),
      rows.map((row) => row.month),
      rows.map((row) => row.oilSm3),
      rows.map((row) => row.gasSm3),
      rows.map((row) => row.waterSm3),
    ],
  );
}

async function upsertTrajectories(
  client: pg.Client,
  sourceId: number,
  wellIds: Map<string, number>,
  dataset: SyntheticDataset,
): Promise<void> {
  const rows = dataset.trajectories;
  const wellIdOf = (wellName: string): number => {
    const id = wellIds.get(wellName);
    if (id === undefined) throw new Error(`Unknown well ${wellName}`);
    return id;
  };
  await client.query(
    `INSERT INTO trajectory_station (well_id, source_id, md_m, tvd_m, incl_deg, azim_deg)
     SELECT * FROM unnest($1::int[], $2::int[], $3::real[], $4::real[], $5::real[], $6::real[])
     ON CONFLICT (well_id, md_m) DO UPDATE SET
       source_id = EXCLUDED.source_id,
       tvd_m = EXCLUDED.tvd_m,
       incl_deg = EXCLUDED.incl_deg,
       azim_deg = EXCLUDED.azim_deg`,
    [
      rows.map((row) => wellIdOf(row.wellName)),
      rows.map(() => sourceId),
      rows.map((row) => row.mdM),
      rows.map((row) => row.tvdM),
      rows.map((row) => row.inclDeg),
      rows.map((row) => row.azimDeg),
    ],
  );
}

async function upsertLogs(
  client: pg.Client,
  sourceId: number,
  wellIds: Map<string, number>,
  dataset: SyntheticDataset,
): Promise<void> {
  for (const curve of dataset.logs) {
    const wellId = wellIds.get(curve.wellName);
    if (wellId === undefined) throw new Error(`Unknown well ${curve.wellName}`);
    await client.query(
      `INSERT INTO log_curve (well_id, source_id, mnemonic, unit, top_m, base_m, samples)
       VALUES ($1, $2, $3, $4, $5, $6, $7::real[])
       ON CONFLICT (well_id, mnemonic) DO UPDATE SET
         source_id = EXCLUDED.source_id,
         unit = EXCLUDED.unit,
         top_m = EXCLUDED.top_m,
         base_m = EXCLUDED.base_m,
         samples = EXCLUDED.samples`,
      [wellId, sourceId, curve.mnemonic, curve.unit, curve.topM, curve.baseM, curve.samples],
    );
  }
}

async function main(): Promise<void> {
  const dataset = generateSyntheticDataset();
  const client = new pg.Client({ connectionString: requireEnv('ETL_DATABASE_URL') });
  await client.connect();
  try {
    await client.query('BEGIN');
    const sourceId = await upsertSource(client, dataset);
    const fieldId = await upsertField(client, sourceId, dataset);
    const wellIds = await upsertWells(client, sourceId, fieldId, dataset);
    await upsertProduction(client, sourceId, wellIds, dataset);
    await upsertFieldProduction(client, sourceId, fieldId, dataset);
    await upsertTrajectories(client, sourceId, wellIds, dataset);
    await upsertLogs(client, sourceId, wellIds, dataset);
    await client.query('UPDATE data_source SET ingested_at = now() WHERE id = $1', [sourceId]);
    await client.query('COMMIT');
    console.log(
      `Seeded field ${dataset.field.name}: ${String(dataset.wells.length)} wells, ` +
        `${String(dataset.production.length)} daily production rows.`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

await main();
