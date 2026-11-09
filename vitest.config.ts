import { defineConfig } from 'vitest/config';

export default defineConfig({
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
          name: 'db',
          root: './db',
          include: ['seed/**/*.test.ts'],
        },
      },
    ],
  },
});
