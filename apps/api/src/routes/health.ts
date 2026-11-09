import type { HealthResponse } from '@petroatlas/shared-types';
import { Router } from 'express';

import type { DatabaseCheck } from '../database.ts';
import { sendError } from '../http-errors.ts';

/** `GET /health`: 200 when the database answers, 503 `DATABASE_UNAVAILABLE` otherwise. */
export function createHealthRouter(checkDatabase: DatabaseCheck): Router {
  const router = Router();

  router.get('/health', async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    if (!(await checkDatabase())) {
      sendError(response, 503, 'DATABASE_UNAVAILABLE', 'La base de datos no responde');
      return;
    }
    const body: HealthResponse = { status: 'ok', database: 'ok' };
    response.json(body);
  });

  return router;
}
