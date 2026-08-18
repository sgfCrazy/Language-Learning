import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:10086',
    headless: true,
  },
  webServer: [
    {
      command: 'pnpm -F @app/server start',
      port: 3000,
      timeout: 60_000,
      env: { NODE_ENV: 'test', PORT: '3000' },
    },
    {
      command: 'pnpm -F @app/web-taro build:h5 && npx http-server dist -p 10086 --silent',
      port: 10086,
      timeout: 120_000,
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
