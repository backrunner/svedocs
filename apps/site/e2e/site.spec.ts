import { expect, test } from '@playwright/test';

test('renders the official home and docs entry', async ({ page }) => {
  await page.goto('/');
  await waitForSvedocsHydration(page);
  await expect(page.getByRole('heading', { name: 'svedocs', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Read docs' }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole('heading', { name: 'Quick Start' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Install' })).toBeVisible();
  await page.goto('/docs/writing/components');
  await waitForSvedocsHydration(page);
  await expect(page.locator('.sd-callout')).toContainText('Components can be injected');
  await page.getByRole('button', { name: 'Toggle SvelteKit' }).click();
  await expect(page.getByRole('button', { name: 'Toggle Cloudflare' })).toBeVisible();
  await expect(page.locator('.sd-code[data-title="component-authoring.ts"]')).toBeVisible();
});

test('search dialog returns section records', async ({ page }) => {
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByPlaceholder('Search docs').fill('cloudflare');
  await expect(page.getByRole('option').filter({ hasText: 'Search' }).first()).toBeVisible();
});

test('search dialog jumps to docs pages', async ({ page }) => {
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByPlaceholder('Search docs').fill('configuration');
  await page.getByRole('option').filter({ hasText: 'Configuration' }).first().click();
  await expect(page).toHaveURL(/\/docs\/configuration$/);
});

test('docs v0 no longer exists', async ({ page }) => {
  const response = await page.goto('/docs/v0');
  expect(response?.status()).toBe(404);
});

test('renders custom layout pages from the layout registry', async ({ page }) => {
  await page.goto('/layout-demo');
  await waitForSvedocsHydration(page, '/layout-demo');
  await expect(page.getByText('Custom layout', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Layout demo' })).toBeVisible();
});

test('renders default single pages without the docs sidebar', async ({ page }) => {
  await page.goto('/changelog');
  await waitForSvedocsHydration(page, '/changelog');
  await expect(page.getByRole('heading', { name: 'Changelog' })).toBeVisible();
  await expect(page.locator('.sd-page')).toBeVisible();
  await expect(page.locator('.sd-sidebar')).toHaveCount(0);
});

test('locale switcher navigates scoped routes', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Scope selects are covered on desktop to avoid mobile topbar wrapping noise.');
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await page.getByRole('button', { name: 'Locale' }).click();
  await page.getByRole('menuitemradio', { name: '中文' }).click();
  await expect(page).toHaveURL(/\/docs\/zh$/);
  await waitForSvedocsHydration(page, '/docs/zh');
  await expect(page.getByRole('heading', { name: '快速开始' })).toBeVisible();
});

test('search and sidebar stay inside the active locale scope', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Scoped sidebar and search are covered on desktop to keep selectors stable.');
  await page.goto('/docs/zh');
  await waitForSvedocsHydration(page, '/docs/zh');
  await expect(page.locator('.sd-sidebar')).toContainText('快速开始');
  await expect(page.locator('.sd-sidebar')).not.toContainText('Quick Start');
  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByPlaceholder('Search docs').fill('Quick Start');
  await expect(page.locator('.sd-empty-state')).toContainText('No matching docs yet.');
});

test('Ask AI streams an answer and citations', async ({ page }) => {
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await page.getByRole('button', { name: 'Ask AI' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ask AI' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill('How do I deploy to Cloudflare?');
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(dialog.locator('.sd-chat-bubble[data-role="user"]').last()).toContainText('How do I deploy to Cloudflare?');
  await expect(dialog.locator('.sd-chat-bubble[data-role="assistant"]').last())
    .toContainText(/relevant source|Ask AI is ready|connect|Cloudflare|docs/i, { timeout: 15000 });
});

test('theme toggle updates the document theme', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/);
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens the sidebar menu', async ({ page }) => {
    await page.goto('/docs/writing/content');
    await waitForSvedocsHydration(page);
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('complementary', { name: 'Documentation' })).toBeVisible();
  });
});

async function waitForSvedocsHydration(page: import('@playwright/test').Page, route?: string) {
  await page.locator('html[data-theme]').waitFor();
  const hydratedRoute = route ?? new URL(page.url()).pathname;
  await page.locator(`html[data-svedocs-route="${hydratedRoute}"]`).waitFor();
}

test('keeps ToC active state bound to scroll position', async ({ page, isMobile }) => {
  test.skip(isMobile, 'ToC is intentionally hidden on mobile.');
  await page.goto('/docs/writing/content');
  await waitForSvedocsHydration(page);
  await page.getByRole('link', { name: 'Section extraction' }).click();
  await expect(page.locator('.sd-toc-link.sd-active')).toContainText('Section extraction');
});
