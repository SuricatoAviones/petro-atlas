import { apiErrorSchema, healthResponseSchema } from '@petroatlas/shared-types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WEB_ORIGIN, startApi } from './test-support.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/health', () => {
  it('responds 200 when the database answers', async () => {
    const response = await fetch(`${await startApi()}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(healthResponseSchema.parse(await response.json())).toEqual({
      status: 'ok',
      database: 'ok',
    });
  });

  it('responds 503 DATABASE_UNAVAILABLE when the database does not answer', async () => {
    const baseUrl = await startApi({ checkDatabase: () => Promise.resolve(false) });
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(503);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('responds 500 INTERNAL without leaking the error detail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const baseUrl = await startApi({
      checkDatabase: () => Promise.reject(new Error('password authentication failed')),
    });
    const response = await fetch(`${baseUrl}/api/health`);
    const bodyText = await response.text();

    expect(response.status).toBe(500);
    expect(apiErrorSchema.parse(JSON.parse(bodyText)).error.code).toBe('INTERNAL');
    expect(bodyText).not.toContain('password');
  });
});

describe('cross-cutting behavior', () => {
  it('responds 404 ROUTE_NOT_FOUND with the common error shape for unknown routes', async () => {
    const response = await fetch(`${await startApi()}/api/does-not-exist`);

    expect(response.status).toBe(404);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('allows CORS only from the web origin', async () => {
    const baseUrl = await startApi();
    const fromWeb = await fetch(`${baseUrl}/api/health`, { headers: { Origin: WEB_ORIGIN } });

    expect(fromWeb.headers.get('access-control-allow-origin')).toBe(WEB_ORIGIN);
  });

  it('responds 429 RATE_LIMITED once the per-IP limit is exceeded', async () => {
    const baseUrl = await startApi({ rateLimitPerMinute: 2 });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/health`);
      statuses.push(response.status);
      if (response.status === 429) {
        expect(apiErrorSchema.parse(await response.json()).error.code).toBe('RATE_LIMITED');
      } else {
        await response.body?.cancel();
      }
    }

    expect(statuses).toEqual([200, 200, 429]);
  });
});

describe('response hardening', () => {
  it('sends security headers and hides the framework', async () => {
    const response = await fetch(`${await startApi()}/api/health`);

    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    expect(response.headers.get('x-powered-by')).toBeNull();
  });
});
