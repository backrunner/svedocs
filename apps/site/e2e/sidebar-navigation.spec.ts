import { expect, test, type Page } from '@playwright/test';

async function expectCurrentPageVisible(page: Page, container = '.sd-sidebar') {
  const active = page.locator(`${container} a[aria-current="page"]`);
  await expect(active).toHaveCount(1);
  await expect(active).toBeInViewport({ ratio: 1 });
}

for (const mode of ['light', 'dark'] as const) {
  test(`reveals sidebar children after next/previous navigation in ${mode} mode`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.emulateMedia({ colorScheme: mode });
    await page.goto('/docs/integrations/search-ai');
    await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/integrations/search-ai');
    await page.addStyleTag({ content: '.sd-sidebar { max-height: 180px; }' });
    const sidebar = page.locator('.sd-sidebar');
    const next = page.locator('.sd-prev-next[data-direction="next"]');
    const nextPath = await next.getAttribute('href');
    await sidebar.evaluate((node) => { node.scrollTop = 0; });
    await next.click();
    await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', nextPath!);
    await expectCurrentPageVisible(page);
    expect(await sidebar.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`sidebar-${mode}.png`) });

    // Keep the previous page above the sidebar viewport to exercise upward scrolling.
    await page.addStyleTag({ content: '.sd-sidebar-link { min-height: 80px; }' });
    await sidebar.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    const previous = page.locator('.sd-prev-next[data-direction="prev"]');
    await previous.click();
    await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/integrations/search-ai');
    await expectCurrentPageVisible(page);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
}

test('opens a manually collapsed active branch on navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('/docs/configuration');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/configuration');
  await page.addStyleTag({ content: '.sd-sidebar { max-height: 180px; }' });
  const group = page.locator('.sd-sidebar details').filter({ has: page.locator('a[href="/docs/configuration/theme"]') }).first();
  await group.locator(':scope > summary').click();
  await expect(group).not.toHaveAttribute('open', '');
  await page.locator('.sd-prev-next[data-direction="next"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/configuration/theme');
  await expect(group).toHaveAttribute('open', '');
  await expectCurrentPageVisible(page);
});

test('keeps sidebar position when the next page is already visible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/docs/installation');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/installation');
  const sidebar = page.locator('.sd-sidebar');
  const next = page.locator('.sd-prev-next[data-direction="next"]');
  const path = await next.getAttribute('href');
  await expect(sidebar.locator(`a[href="${path}"]`)).toBeInViewport({ ratio: 1 });
  const position = await sidebar.evaluate((node) => node.scrollTop);
  await next.click();
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', path!);
  await expectCurrentPageVisible(page);
  expect(await sidebar.evaluate((node) => node.scrollTop)).toBe(position);
});

test('reveals the current child when opening mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/docs/reference/cli');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/reference/cli');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expectCurrentPageVisible(page, '.sd-mobile-docnav');
  expect(await page.locator('.sd-topbar-menu').evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
