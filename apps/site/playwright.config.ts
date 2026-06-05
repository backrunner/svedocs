import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL: 'http://127.0.0.1:4173'
  },
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
