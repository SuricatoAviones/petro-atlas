import path from 'node:path';

import type { NextConfig } from 'next';

const monorepoRoot = path.join(import.meta.dirname, '../..');

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (see Dockerfile).
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
    // Use the workspace source, as `tsconfig.base.json` does with the `@petroatlas/source`
    // condition. Without this, `next dev` only works after the package has been built.
    resolveAlias: {
      '@petroatlas/shared-types': '../../packages/shared-types/src/index.ts',
      '@suricatoaviones/petro-calc': '../../packages/petro-calc/src/index.ts',
    },
  },
  reactStrictMode: true,
  poweredByHeader: false,
  // The end-to-end tests use their own build directory, so they can run while `pnpm dev` is open.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
