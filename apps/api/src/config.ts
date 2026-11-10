import { z } from 'zod';

const envSchema = z.object({
  // Read-only role (petroatlas_api, docs/05).
  API_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Explicit port of `pnpm dev` and Docker Compose. */
  API_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  /** Port assigned by hosting platforms such as Render; `API_PORT` takes precedence. */
  PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(1200),
});

export interface ApiConfig {
  databaseUrl: string;
  port: number;
  webOrigin: string;
  rateLimitPerMinute: number;
}

/** Validates the environment at startup, so a bad configuration fails fast with a clear error. */
export function loadConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid API configuration (see .env.example):\n${z.prettifyError(parsed.error)}`,
    );
  }
  return {
    databaseUrl: parsed.data.API_DATABASE_URL,
    port: parsed.data.API_PORT ?? parsed.data.PORT ?? 4000,
    webOrigin: parsed.data.WEB_ORIGIN,
    rateLimitPerMinute: parsed.data.RATE_LIMIT_PER_MINUTE,
  };
}
