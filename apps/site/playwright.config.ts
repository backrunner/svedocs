import { defineConfig } from '@playwright/test';

const port = process.env.SVEDOCS_E2E_PORT ?? '4173';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL
  },
  webServer: {
    command: `pnpm exec vite dev --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
