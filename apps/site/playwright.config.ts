import { defineConfig } from '@playwright/test';

const port = process.env.SVEDOCS_E2E_PORT ?? '4173';
const host = process.env.SVEDOCS_E2E_HOST ?? '127.0.0.1';
const baseURL = `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
const preview = Boolean(process.env.SVEDOCS_E2E_PREVIEW);
const edge = !['static', 'spa'].includes(process.env.SVEDOCS_BUILD_MODE ?? 'edge');

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
    command: preview && edge
      ? `node ../../scripts/serve-production-ssr.mjs --host ${host} --port ${port}`
      : `pnpm exec vite ${preview ? 'preview' : 'dev'} --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
