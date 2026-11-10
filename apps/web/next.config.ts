import path from 'node:path';

import type { NextConfig } from 'next';

const monorepoRoot = path.join(import.meta.dirname, '../..');

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (see Dockerfile).
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  turbopack: { root: monorepoRoot },
  reactStrictMode: true,
  poweredByHeader: false,
  // The end-to-end tests use their own build directory, so they can run while `pnpm dev` is open.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
