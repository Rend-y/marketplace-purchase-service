import path from 'node:path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // Mirrors the `@/*` mapping from tsconfig; `tsc-alias` does the same for the build output.
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['test/setup/silence-nest-logger.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/**/*.module.ts',
        'src/database/migrations/**',
        'src/main.ts',
      ],
    },
  },
});
