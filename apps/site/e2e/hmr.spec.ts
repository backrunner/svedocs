import { writeFile, rename, rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

// Run alone: SVEDOCS_E2E_HMR=1 pnpm exec playwright test e2e/hmr.spec.ts --workers=1
test.skip(!process.env.SVEDOCS_E2E_HMR, 'Mutates temporary content; run separately from UI tests.');

test('refreshes added, edited, renamed and removed Svelte content', async ({ page }) => {
  const original = 'content/docs/performance-watch-fixture.svx';
  const renamed = 'content/docs/performance-renamed-fixture.svx';
  const hydrationErrors: string[] = [];
  let phase = 'initial';
  page.on('console', (message) => {
    if (/hydration_(?:mismatch|html_changed)/.test(message.text())) hydrationErrors.push(`${phase}: ${message.text()}`);
  });
  try {
    await page.goto('/docs', { waitUntil: 'networkidle' });
    phase = 'add';
    await writeFile(original, '# Watch fixture\n\n## First section\n\nInitial content.');
    await expect(async () => {
      await page.goto('/docs/performance-watch-fixture', { waitUntil: 'networkidle' });
      await expect(page.getByText('Initial content.', { exact: true })).toBeVisible();
    }).toPass();
    await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/performance-watch-fixture');
    phase = 'edit';
    await writeFile(original, '# Watch fixture\n\n## Updated section\n\nUpdated content.');
    await expect(page.getByText('Updated content.', { exact: true })).toBeVisible();
    await expect(page.locator('.sd-toc-link[href="#updated-section"]').last()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await (await page.request.get('/docs/performance-watch-fixture')).text()).toContain('Updated content.');
    expect(await (await page.request.get('/docs/performance-watch-fixture/index.md')).text()).toContain('Updated content.');
    phase = 'consecutive saves';
    await writeFile(original, '# Watch fixture\n\nIntermediate content.');
    await writeFile(original, '# Watch fixture\n\nNewest content.');
    await expect(page.getByText('Newest content.', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    phase = 'rename';
    await rename(original, renamed);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.goto('/docs/performance-renamed-fixture', { waitUntil: 'networkidle' });
    await expect(page.getByText('Newest content.', { exact: true })).toBeVisible();
    phase = 'remove';
    await rm(renamed);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(hydrationErrors).toEqual([]);
  } finally {
    await Promise.all([rm(original, { force: true }), rm(renamed, { force: true })]);
  }
});
