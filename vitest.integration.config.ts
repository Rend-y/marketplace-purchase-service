import path from 'node:path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const MINUTE = 60_000;

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // Mirrors the `@/*` mapping from tsconfig; `tsc-alias` does the same for the build output.
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/specs/**/*.spec.ts'],
    globalSetup: ['test/integration/setup/global-setup.ts'],
    setupFiles: ['test/integration/setup/env-setup.ts'],
    testTimeout: MINUTE,
    hookTimeout: 3 * MINUTE,
    teardownTimeout: 2 * MINUTE,
    // Containers are shared across suites, so suites must not run concurrently
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: true, maxThreads: 1, minThreads: 1 },
    },
    fileParallelism: false,
  },
});
