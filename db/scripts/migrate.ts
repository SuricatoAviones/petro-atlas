/**
 * Applies pending SQL migrations from db/migrations in file-name order (docs/05, "Migraciones").
 *
 * - Each migration runs in its own transaction and is recorded in `schema_migrations`.
 * - A checksum of every applied file is stored; if a published migration is edited, the run fails.
 * - An advisory lock keeps two runners from applying migrations at the same time.
 *
 * Connects as the read-write role (`ETL_DATABASE_URL`, petroatlas_etl).
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

import pg from 'pg';

import { requireEnv } from './env.ts';

const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url);
const MIGRATION_FILE_NAME = /^\d{4}_[a-z0-9_]+\.sql$/;
// Arbitrary, but must be the same for every runner.
const MIGRATION_LOCK_ID = 5_051_001;

interface Migration {
  name: string;
  sql: string;
  checksum: string;
}

async function readMigrations(): Promise<Migration[]> {
  const fileNames = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();
  const invalidNames = fileNames.filter((name) => !MIGRATION_FILE_NAME.test(name));
  if (invalidNames.length > 0) {
    throw new Error(
      `Invalid migration file names: ${invalidNames.join(', ')} (expected 0001_name.sql)`,
    );
  }

  return Promise.all(
    fileNames.map(async (name) => {
      // Normalize line endings so the checksum does not depend on the checkout platform.
      const sql = (await readFile(new URL(name, MIGRATIONS_DIR), 'utf8')).replaceAll('\r\n', '\n');
      const checksum = createHash('sha256').update(sql).digest('hex');
      return { name, sql, checksum };
    }),
  );
}

async function applyPendingMigrations(
  client: pg.Client,
  migrations: Migration[],
): Promise<string[]> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  const { rows } = await client.query<{ name: string; checksum: string }>(
    'SELECT name, checksum FROM schema_migrations',
  );
  const appliedChecksums = new Map(rows.map((row) => [row.name, row.checksum]));

  const appliedNow: string[] = [];
  for (const migration of migrations) {
    const appliedChecksum = appliedChecksums.get(migration.name);
    if (appliedChecksum !== undefined) {
      if (appliedChecksum !== migration.checksum) {
        throw new Error(
          `Migration ${migration.name} changed after it was applied. ` +
            'Published migrations are never edited; add a new one instead.',
        );
      }
      continue;
    }

    await client.query('BEGIN');
    try {
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        migration.name,
        migration.checksum,
      ]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${migration.name} failed`, { cause: error });
    }
    appliedNow.push(migration.name);
  }
  return appliedNow;
}

async function main(): Promise<void> {
  const migrations = await readMigrations();
  const client = new pg.Client({ connectionString: requireEnv('ETL_DATABASE_URL') });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    const appliedNow = await applyPendingMigrations(client, migrations);
    console.log(
      appliedNow.length > 0
        ? `Applied ${String(appliedNow.length)} migration(s): ${appliedNow.join(', ')}`
        : 'Database schema is up to date.',
    );
  } finally {
    await client.end();
  }
}

await main();
