import pg from 'pg';

import { logError } from './log.ts';

/** What the routes need from the pool: parametrized queries. */
export type Database = Pick<pg.Pool, 'query'>;

/** Returns true when the database answers a trivial query. */
export type DatabaseCheck = () => Promise<boolean>;

export function createDatabasePool(connectionString: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 2_000,
    query_timeout: 5_000,
  });
  // Without a listener, an error on an idle client would crash the process.
  pool.on('error', (error) => {
    logError('Idle database client error', error);
  });
  return pool;
}

export function createDatabaseCheck(database: Database): DatabaseCheck {
  return async () => {
    try {
      await database.query('SELECT 1');
      return true;
    } catch (error) {
      logError('Database health check failed', error);
      return false;
    }
  };
}
