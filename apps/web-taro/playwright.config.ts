import { defineConfig } from '@playwright/test';

// E2E 需要 server(:3000) 与 H5(:10086) 已在运行。
// 启动方式见 e2e:setup 脚本（先 build 再起服务）。
// 也可手动：
//   pnpm -F @app/server build && DATABASE_URL="file:./e2e.db" node apps/server/dist/main.js
//   pnpm -F @app/web-taro build:h5 && npx http-server apps/web-taro/dist -p 10086 --silent
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:10086',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
