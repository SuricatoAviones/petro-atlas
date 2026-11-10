import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 3100;
const API_PORT = 4100;
const WEB_ORIGIN = `http://localhost:${String(WEB_PORT)}`;
const API_ORIGIN = `http://localhost:${String(API_PORT)}`;

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  'postgres://petroatlas_api:api_dev_password@localhost:55432/petroatlas';

/**
 * End-to-end tests run against their own API and web servers and the seeded development
 * database (`docker compose up --detach db db-setup`). The basemap is a local blank style, so
 * the tests do not depend on the internet.
 */
export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: WEB_ORIGIN,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @petroatlas/api dev',
      url: `${API_ORIGIN}/api/health`,
      timeout: 120_000,
      reuseExistingServer: process.env.CI === undefined,
      env: {
        API_DATABASE_URL: databaseUrl,
        API_PORT: String(API_PORT),
        WEB_ORIGIN,
      },
    },
    {
      command: `pnpm --filter @petroatlas/web exec next dev --port ${String(WEB_PORT)}`,
      url: WEB_ORIGIN,
      timeout: 120_000,
      reuseExistingServer: process.env.CI === undefined,
      env: {
        NEXT_DIST_DIR: '.next-e2e',
        NEXT_PUBLIC_API_URL: API_ORIGIN,
        NEXT_PUBLIC_MAP_STYLE_URL: `${WEB_ORIGIN}/test-basemap.json`,
      },
    },
  ],
});
