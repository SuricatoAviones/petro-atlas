/** Helpers shared by the API tests. */
import { once } from 'node:events';
import type { Server } from 'node:http';

import { afterAll, afterEach } from 'vitest';

import { createApp, type AppOptions } from './app.ts';
import { createDatabasePool, type Database } from './database.ts';

export const WEB_ORIGIN = 'http://localhost:3000';

/** The development database of docker-compose.yml, read through the read-only role. */
const TEST_DATABASE_URL =
  process.env.API_DATABASE_URL ??
  'postgres://petroatlas_api:api_dev_password@localhost:55432/petroatlas';

/** The fictitious field loaded by `pnpm db:seed`; route tests only assert on its data. */
export const SEED_FIELD_SLUG = 'synthetic-alpha';

const runningServers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    runningServers.splice(0).map((server) => {
      server.close();
      return once(server, 'close');
    }),
  );
});

/** A database for tests that must not reach one: any query fails. */
export const noDatabase: Database = {
  query: () => {
    throw new Error('This test must not query the database');
  },
};

/** Starts the app on a free port and returns its base URL. Stopped after each test. */
export async function startApi(overrides: Partial<AppOptions> = {}): Promise<string> {
  const app = createApp({
    database: noDatabase,
    checkDatabase: () => Promise.resolve(true),
    webOrigin: WEB_ORIGIN,
    rateLimitPerMinute: 1000,
    ...overrides,
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  runningServers.push(server);
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Expected a TCP address');
  return `http://127.0.0.1:${String(address.port)}`;
}

/**
 * Connects to the seeded development database and closes the pool after the file's tests.
 * Fails with instructions when the database is not running.
 */
export async function connectToSeededDatabase(): Promise<Database> {
  const pool = createDatabasePool(TEST_DATABASE_URL);
  afterAll(() => pool.end());
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    throw new Error(
      'The API route tests need the seeded database. Start it with: ' +
        'docker compose up --detach --wait db db-setup',
      { cause: error },
    );
  }
  return pool;
}

/** GETs a path and returns the status and the parsed JSON body. */
export async function getJson(
  baseUrl: string,
  path: string,
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json(), headers: response.headers };
}
