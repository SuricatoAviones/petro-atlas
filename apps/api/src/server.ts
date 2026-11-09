import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createDatabaseCheck, createDatabasePool } from './database.ts';

const config = loadConfig(process.env);
const pool = createDatabasePool(config.databaseUrl);
const app = createApp({
  checkDatabase: createDatabaseCheck(pool),
  webOrigin: config.webOrigin,
  rateLimitPerMinute: config.rateLimitPerMinute,
});

const server = app.listen(config.port, () => {
  console.log(`PetroAtlas API listening on port ${String(config.port)}`);
});

function shutDown(): void {
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
