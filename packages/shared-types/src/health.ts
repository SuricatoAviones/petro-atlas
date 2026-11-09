import { z } from 'zod';

/**
 * Body of `GET /api/health` when the API and its database respond (docs/06-api.md).
 * When the database does not respond, the route answers 503 with `DATABASE_UNAVAILABLE`.
 */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
