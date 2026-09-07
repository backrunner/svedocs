import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.skip(!process.env.SVEDOCS_E2E_PREVIEW, 'Performance assertions require a production build.');

for (const route of ['/docs', '/docs/zh/not-a-real-page']) {
  test(`loads local search only when opened on ${route}`, async ({ page }) => {
    const manifest = JSON.parse(await readFile('.svelte-kit/output/client/.vite/manifest.json', 'utf8')) as Record<string, { file: string; name?: string }>;
    const searchFiles = Object.values(manifest).filter((entry) => entry.name === 'search' || entry.name === 'local').map((entry) => entry.file);
    expect(searchFiles.length).toBeGreaterThan(0);
    const requests: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route, { waitUntil: 'networkidle' });
    expect(requests.filter((url) => searchFiles.some((file) => url.endsWith(file)))).toEqual([]);
    expect(requests.some((url) => /worker[^/]*\.js/.test(url))).toBe(false);
    const worker = page.waitForEvent('worker');
    await page.locator('.sd-search-trigger').click();
    await page.getByRole('combobox').fill(route.includes('/zh') ? '配置' : 'configuration');
    await expect(page.getByRole('option').first()).toBeVisible();
    await worker;
    expect(requests.some((url) => searchFiles.some((file) => url.endsWith(file)))).toBe(true);
    await page.getByRole('combobox').press('Escape');
    await page.locator('.sd-search-trigger').click();
    await page.getByRole('combobox').fill('theme');
    await expect(page.getByRole('option').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('keeps local search usable when worker creation fails', async ({ page }) => {
  await page.addInitScript(() => {
    window.Worker = class { constructor() { throw new Error('Worker disabled by host'); } } as unknown as typeof Worker;
  });
  await page.goto('/docs');
  await page.locator('.sd-search-trigger').click();
  await page.getByRole('combobox').fill('configuration');
  await expect(page.getByRole('option').first()).toBeVisible();
});
