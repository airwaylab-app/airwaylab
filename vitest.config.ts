import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    setupFiles: ['./__tests__/setup.ts'],
    // The suite has timing-sensitive tests that flake under CI's constrained
    // parallelism (2-core runners), hitting a different test each run. Retry in
    // CI only, matching playwright.config.ts (retries: 2). Root-cause de-flaking
    // of the timing-sensitive tests remains a separate task.
    retry: process.env.CI ? 2 : 0,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
