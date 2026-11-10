import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.ts';

const DATABASE_URL = 'postgres://petroatlas_api:secret@localhost:5432/petroatlas';

describe('loadConfig', () => {
  it('defaults to port 4000 and the local web origin', () => {
    const config = loadConfig({ API_DATABASE_URL: DATABASE_URL });

    expect(config.port).toBe(4000);
    expect(config.webOrigin).toBe('http://localhost:3000');
  });

  it('uses the port a hosting platform injects as PORT', () => {
    const config = loadConfig({ API_DATABASE_URL: DATABASE_URL, PORT: '10000' });

    expect(config.port).toBe(10_000);
  });

  it('lets API_PORT override PORT', () => {
    const config = loadConfig({
      API_DATABASE_URL: DATABASE_URL,
      API_PORT: '4100',
      PORT: '10000',
    });

    expect(config.port).toBe(4100);
  });

  it('rejects an invalid port before the server starts', () => {
    expect(() => loadConfig({ API_DATABASE_URL: DATABASE_URL, PORT: '70000' })).toThrow(
      /Invalid API configuration/,
    );
  });

  it('requires a PostgreSQL URL', () => {
    expect(() => loadConfig({ API_DATABASE_URL: 'https://example.com' })).toThrow(
      /Invalid API configuration/,
    );
  });
});
