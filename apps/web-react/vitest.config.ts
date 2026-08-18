import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@app/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/e2e/**', '**/node_modules/**'],
  },
});