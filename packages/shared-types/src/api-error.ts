import { z } from 'zod';

/** Error codes from docs/06-api.md, "Errores". */
export const apiErrorCodeSchema = z.enum([
  'INVALID_PARAMS',
  'WELL_NOT_FOUND',
  'FIELD_NOT_FOUND',
  'ROUTE_NOT_FOUND',
  'RATE_LIMITED',
  'INTERNAL',
  'DATABASE_UNAVAILABLE',
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/** Body of every error response: a code and a message, never internal details. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
