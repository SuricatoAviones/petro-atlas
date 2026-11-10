/**
 * Load stage: upserts fields and wells in one transaction (docs/10, ETL rules 1 and 2).
 * Sodir publishes coordinates in ED50 (EPSG:4230); PostGIS converts them to EPSG:4326 here.
 */
import pg from 'pg';

import type { NormalizedField, NormalizedWell } from './normalize.ts';

export const SODIR_SOURCE = {
  name: 'Sodir FactPages',
  // The exact licence text is an open question in docs/10 and must be confirmed before a demo.
  license: 'Open data from the Norwegian Offshore Directorate (licence text to be confirmed)',
  url: 'https://factpages.sodir.no/',
} as const;

const ED50_TO_WGS84 = (geometrySql: string): string =>
  `ST_Transform(ST_SetSRID(${geometrySql}, 4230), 4326)`;

async function upsertSource(client: pg.Client): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO data_source (name, license, url)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET license = EXCLUDED.license, url = EXCLUDED.url
     RETURNING id`,
    [SODIR_SOURCE.name, SODIR_SOURCE.license, SODIR_SOURCE.url],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('data_source upsert returned no row');
  return id;
}

/** `field` has no natural unique key in the schema, so the upsert is a lookup by source and name. */
async function upsertFields(
  client: pg.Client,
  sourceId: number,
  fields: NormalizedField[],
): Promise<Map<string, number>> {
  const existing = await client.query<{ id: number; name: string }>(
    'SELECT id, name FROM field WHERE source_id = $1',
    [sourceId],
  );
  const fieldIds = new Map(existing.rows.map((row) => [row.name, row.id]));
  // Some published outlines have self-intersecting rings; repair them and keep only polygons.
  const geometrySql = `ST_Multi(ST_CollectionExtract(ST_MakeValid(${ED50_TO_WGS84('ST_GeomFromGeoJSON($4)')}), 3))`;

  for (const field of fields) {
    const boundaryGeoJson =
      field.boundaryEd50 === null
        ? null
        : JSON.stringify({ type: 'MultiPolygon', coordinates: field.boundaryEd50 });
    const existingId = fieldIds.get(field.name);
    if (existingId !== undefined) {
      await client.query(
        `UPDATE field SET name = $1, operator = $2, status = $3, geom = ${geometrySql}
         WHERE id = $5`,
        [field.name, field.operator, field.status, boundaryGeoJson, existingId],
      );
      continue;
    }
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO field (name, operator, status, geom, source_id)
       VALUES ($1, $2, $3, ${geometrySql}, $5)
       RETURNING id`,
      [field.name, field.operator, field.status, boundaryGeoJson, sourceId],
    );
    const id = rows[0]?.id;
    if (id === undefined) throw new Error(`field insert returned no row for ${field.name}`);
    fieldIds.set(field.name, id);
  }
  return fieldIds;
}

async function upsertWells(
  client: pg.Client,
  sourceId: number,
  fieldIds: Map<string, number>,
  wells: NormalizedWell[],
): Promise<void> {
  await client.query(
    `INSERT INTO well (source_id, field_id, name, well_type, status, spud_date, total_depth_m, geom)
     SELECT $1, field_id, name, well_type, status, spud_date, total_depth_m,
            ${ED50_TO_WGS84('ST_MakePoint(lon_deg, lat_deg)')}
     FROM unnest($2::int[], $3::text[], $4::text[], $5::text[], $6::date[], $7::real[],
                 $8::float8[], $9::float8[])
       AS row (field_id, name, well_type, status, spud_date, total_depth_m, lon_deg, lat_deg)
     ON CONFLICT (source_id, name) DO UPDATE SET
       field_id = EXCLUDED.field_id,
       well_type = EXCLUDED.well_type,
       status = EXCLUDED.status,
       spud_date = EXCLUDED.spud_date,
       total_depth_m = EXCLUDED.total_depth_m,
       geom = EXCLUDED.geom`,
    [
      sourceId,
      wells.map((well) =>
        well.fieldName === null ? null : (fieldIds.get(well.fieldName) ?? null),
      ),
      wells.map((well) => well.name),
      wells.map((well) => well.wellType),
      wells.map((well) => well.status),
      wells.map((well) => well.spudDate),
      wells.map((well) => well.totalDepthM),
      wells.map((well) => well.lonEd50Deg),
      wells.map((well) => well.latEd50Deg),
    ],
  );
}

export async function loadSodir(
  connectionString: string,
  fields: NormalizedField[],
  wells: NormalizedWell[],
): Promise<void> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    const sourceId = await upsertSource(client);
    const fieldIds = await upsertFields(client, sourceId, fields);
    await upsertWells(client, sourceId, fieldIds, wells);
    await client.query('UPDATE data_source SET ingested_at = now() WHERE id = $1', [sourceId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
