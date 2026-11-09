import { describe, expect, it } from 'vitest';

import { apiErrorSchema, healthResponseSchema } from './index.ts';

describe('healthResponseSchema', () => {
  it('accepts a healthy response', () => {
    expect(healthResponseSchema.safeParse({ status: 'ok', database: 'ok' }).success).toBe(true);
  });

  it.each([
    { status: 'ok' },
    { status: 'degraded', database: 'ok' },
    { status: 'ok', database: 'down' },
    null,
  ])('rejects %j', (body) => {
    expect(healthResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe('apiErrorSchema', () => {
  it('accepts the error example from docs/06', () => {
    const body = { error: { code: 'WELL_NOT_FOUND', message: 'No existe el pozo 9999' } };
    expect(apiErrorSchema.safeParse(body).success).toBe(true);
  });

  it.each([
    { error: { code: 'TEAPOT', message: 'Código desconocido' } },
    { error: { code: 'INTERNAL' } },
    { code: 'INTERNAL', message: 'Sin envoltorio error' },
  ])('rejects %j', (body) => {
    expect(apiErrorSchema.safeParse(body).success).toBe(false);
  });
});
