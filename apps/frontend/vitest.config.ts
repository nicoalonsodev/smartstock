import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [
      ['src/test/rls-isolation.test.ts', 'node'],
      ['src/test/facturacion-integration.test.ts', 'node'],
      ['src/test/importacion-integration.test.ts', 'node'],
      ['src/test/arca-integration.test.ts', 'node'],
      ['src/test/arca-retry-queue.test.ts', 'node'],
    ],
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
