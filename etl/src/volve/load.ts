/**
 * Load stage for Volve: upserts daily production, monthly field production and trajectories in
 * one transaction (docs/10, ETL rules 1 and 2). Wells come from the Sodir ETL.
 */
import pg from 'pg';

import { VOLVE_SOURCE } from './files.ts';
import type {
  NormalizedMonthlyFieldProduction,
  NormalizedProductionDay,
  NormalizedTrajectoryStation,
} from './normalize.ts';

/** Sodir wells that belong to the Volve field, keyed by the name used in both sources. */
export async function getKnownWells(connectionString: string): Promise<Map<string, number>> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query<{ id: number; name: string }>(
      `SELECT w.id, w.name
       FROM well w
       JOIN field f ON f.id = w.field_id
       WHERE upper(f.name) = 'VOLVE'`,
    );
    return new Map(rows.map((row) => [row.name, row.id]));
  } finally {
    await client.end();
  }
}

async function upsertSource(client: pg.Client): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO data_source (name, license, url)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET license = EXCLUDED.license, url = EXCLUDED.url
     RETURNING id`,
    [VOLVE_SOURCE.name, VOLVE_SOURCE.license, VOLVE_SOURCE.url],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('data_source upsert returned no row');
  return id;
}

function wellIdOf(wellIds: ReadonlyMap<string, number>, wellName: string): number {
  const id = wellIds.get(wellName);
  if (id === undefined) throw new Error(`Unknown Volve well ${wellName}`);
  return id;
}

async function upsertProduction(
  client: pg.Client,
  wellIds: ReadonlyMap<string, number>,
  days: readonly NormalizedProductionDay[],
): Promise<void> {
  if (days.length === 0) return;
  await client.query(
    `INSERT INTO production_daily
       (well_id, date, oil_sm3, gas_sm3, water_sm3, water_inj_sm3, on_stream_h,
        bhp_bar, whp_bar, bht_c, wht_c, choke_pct)
     SELECT * FROM unnest(
       $1::int[], $2::date[], $3::real[], $4::real[], $5::real[], $6::real[], $7::real[],
       $8::real[], $9::real[], $10::real[], $11::real[], $12::real[])
     ON CONFLICT (well_id, date) DO UPDATE SET
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
      days.map((day) => wellIdOf(wellIds, day.wellName)),
      days.map((day) => day.date),
      days.map((day) => day.oilSm3),
      days.map((day) => day.gasSm3),
      days.map((day) => day.waterSm3),
      days.map((day) => day.waterInjSm3),
      days.map((day) => day.onStreamH),
      days.map((day) => day.bhpBar),
      days.map((day) => day.whpBar),
      days.map((day) => day.bhtC),
      days.map((day) => day.whtC),
      days.map((day) => day.chokePct),
    ],
  );
}

async function fieldIdOfVolve(client: pg.Client): Promise<number | null> {
  const { rows } = await client.query<{ id: number }>(
    "SELECT id FROM field WHERE upper(name) = 'VOLVE' LIMIT 1",
  );
  return rows[0]?.id ?? null;
}

async function upsertFieldProduction(
  client: pg.Client,
  months: readonly NormalizedMonthlyFieldProduction[],
): Promise<void> {
  if (months.length === 0) return;
  const fieldId = await fieldIdOfVolve(client);
  if (fieldId === null) {
    throw new Error('The VOLVE field is not loaded; run pnpm etl:sodir first');
  }
  await client.query(
    `INSERT INTO field_production_monthly (field_id, month, oil_sm3, gas_sm3, water_sm3)
     SELECT * FROM unnest($1::int[], $2::date[], $3::real[], $4::real[], $5::real[])
     ON CONFLICT (field_id, month) DO UPDATE SET
       oil_sm3 = EXCLUDED.oil_sm3,
       gas_sm3 = EXCLUDED.gas_sm3,
       water_sm3 = EXCLUDED.water_sm3`,
    [
      months.map(() => fieldId),
      months.map((month) => month.month),
      months.map((month) => month.oilSm3),
      months.map((month) => month.gasSm3),
      months.map((month) => month.waterSm3),
    ],
  );
}

async function replaceTrajectories(
  client: pg.Client,
  wellIds: ReadonlyMap<string, number>,
  stations: readonly NormalizedTrajectoryStation[],
): Promise<void> {
  if (stations.length === 0) return;
  const ids = [...new Set(stations.map((station) => wellIdOf(wellIds, station.wellName)))];
  await client.query('DELETE FROM trajectory_station WHERE well_id = ANY($1::int[])', [ids]);
  await client.query(
    `INSERT INTO trajectory_station (well_id, md_m, tvd_m, incl_deg, azim_deg)
     SELECT * FROM unnest($1::int[], $2::real[], $3::real[], $4::real[], $5::real[])
     ON CONFLICT (well_id, md_m) DO UPDATE SET
       tvd_m = EXCLUDED.tvd_m,
       incl_deg = EXCLUDED.incl_deg,
       azim_deg = EXCLUDED.azim_deg`,
    [
      stations.map((station) => wellIdOf(wellIds, station.wellName)),
      stations.map((station) => station.mdM),
      stations.map((station) => station.tvdM),
      stations.map((station) => station.inclDeg),
      stations.map((station) => station.azimDeg),
    ],
  );
}

export interface VolveLoadResult {
  productionDays: number;
  fieldMonths: number;
  trajectoryStations: number;
}

export async function loadVolve(
  connectionString: string,
  wellIds: ReadonlyMap<string, number>,
  days: readonly NormalizedProductionDay[],
  months: readonly NormalizedMonthlyFieldProduction[],
  stations: readonly NormalizedTrajectoryStation[],
): Promise<VolveLoadResult> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    const sourceId = await upsertSource(client);
    await upsertProduction(client, wellIds, days);
    await upsertFieldProduction(client, months);
    await replaceTrajectories(client, wellIds, stations);
    await client.query('UPDATE data_source SET ingested_at = now() WHERE id = $1', [sourceId]);
    await client.query('COMMIT');
    return {
      productionDays: days.length,
      fieldMonths: months.length,
      trajectoryStations: stations.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
