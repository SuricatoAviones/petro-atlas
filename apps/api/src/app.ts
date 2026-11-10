import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import type { Database, DatabaseCheck } from './database.ts';
import { errorHandler, notFoundHandler, sendError } from './http-errors.ts';
import { createFieldsRouter } from './routes/fields.ts';
import { createHealthRouter } from './routes/health.ts';
import { createMetaRouter } from './routes/meta.ts';
import { TILE_CONTENT_TYPE, createTilesRouter } from './routes/tiles.ts';
import { createWellsRouter } from './routes/wells.ts';

export interface AppOptions {
  /** Read-only connection (petroatlas_api, docs/05). */
  database: Database;
  checkDatabase: DatabaseCheck;
  /** The only origin allowed by CORS (docs/12, "Seguridad"). */
  webOrigin: string;
  rateLimitPerMinute: number;
}

/** Builds the Express app. Dependencies are injected so they can be replaced in tests. */
export function createApp({
  database,
  checkDatabase,
  webOrigin,
  rateLimitPerMinute,
}: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  // Security headers. The web reads the API from another origin, so responses must be loadable
  // cross-origin; CORS below still restricts which origin may read them.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: webOrigin, methods: ['GET'] }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMinute,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_request, response) => {
        sendError(response, 429, 'RATE_LIMITED', 'Demasiadas peticiones; inténtalo en un minuto');
      },
    }),
  );
  // GeoJSON and vector tiles shrink several times over. Tiles are not in the default list of
  // compressible types.
  app.use(
    compression({
      filter: (request, response) =>
        String(response.getHeader('Content-Type')).startsWith(TILE_CONTENT_TYPE) ||
        compression.filter(request, response),
    }),
  );

  app.use('/api', createHealthRouter(checkDatabase));
  app.use('/api', createFieldsRouter(database));
  app.use('/api', createWellsRouter(database));
  app.use('/api', createMetaRouter(database));
  app.use('/api', createTilesRouter(database));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
