import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

const MINUTE = 60_000;

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
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
