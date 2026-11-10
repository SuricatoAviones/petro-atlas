import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';

import type { DatabaseCheck } from './database.ts';
import { errorHandler, notFoundHandler, sendError } from './http-errors.ts';
import { createHealthRouter } from './routes/health.ts';

export interface AppOptions {
  checkDatabase: DatabaseCheck;
  /** The only origin allowed by CORS (docs/12, "Seguridad"). */
  webOrigin: string;
  rateLimitPerMinute: number;
}

/** Builds the Express app. Dependencies are injected so tests run without a database. */
export function createApp({ checkDatabase, webOrigin, rateLimitPerMinute }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');

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

  app.use('/api', createHealthRouter(checkDatabase));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
