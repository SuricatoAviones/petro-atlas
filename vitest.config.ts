import { defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolve workspace packages to their TypeScript sources, as in tsconfig.base.json.
  ssr: { resolve: { conditions: ['@petroatlas/source', ...defaultServerConditions] } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'petro-calc',
          root: './packages/petro-calc',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'shared-types',
          root: './packages/shared-types',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'api',
          root: './apps/api',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'etl',
          root: './etl',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          root: './db',
          include: ['seed/**/*.test.ts'],
        },
      },
    ],
  },
});
