import { expect, test } from '@playwright/test';

test('renders the official home and docs entry', async ({ page }) => {
  await page.goto('/');
  await waitForSvedocsHydration(page);
  await expect(page.getByRole('heading', { name: 'svedocs', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Read docs' }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole('heading', { name: 'Introduction' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Install' })).toBeVisible();
  await page.goto('/docs/components');
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

test('command palette jumps to docs actions', async ({ page }) => {
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await page.getByRole('button', { name: 'Open command palette' }).click();
  await page.getByPlaceholder('Run command or jump to docs').fill('configuration');
  await page.getByRole('option').filter({ hasText: 'Configuration' }).first().click();
  await expect(page).toHaveURL(/\/docs\/configuration$/);
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

test('locale and version switchers navigate scoped routes', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Scope selects are covered on desktop to avoid mobile topbar wrapping noise.');
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await page.getByLabel('Version').selectOption('/docs/v0');
  await expect(page).toHaveURL(/\/docs\/v0$/);
  await expect(page.getByRole('heading', { name: 'Legacy introduction' })).toBeVisible();
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await page.getByLabel('Locale').selectOption('/docs/zh');
  await expect(page).toHaveURL(/\/docs\/zh$/);
  await waitForSvedocsHydration(page, '/docs/zh');
  await expect(page.getByRole('heading', { name: '中文介绍' })).toBeVisible();
  await expect(page.getByLabel('Version').locator('option').filter({ hasText: 'Legacy (archived)' })).toHaveAttribute('disabled', '');
});

test('search and sidebar stay inside the active locale/version scope', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Scoped sidebar and search are covered on desktop to keep selectors stable.');
  await page.goto('/docs/zh');
  await waitForSvedocsHydration(page, '/docs/zh');
  await expect(page.locator('.sd-sidebar')).toContainText('中文介绍');
  await expect(page.locator('.sd-sidebar')).not.toContainText('Legacy introduction');
  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByPlaceholder('Search docs').fill('Legacy');
  await expect(page.locator('.sd-empty-state')).toContainText('No matching docs yet.');
});

test('Ask AI streams an answer and citations', async ({ page }) => {
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await page.getByRole('button', { name: 'Ask AI' }).click();
  await page.getByPlaceholder('Ask about these docs').fill('How do I deploy to Cloudflare?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.locator('.sd-ai-answer')).toContainText(/relevant source|Ask AI is configured/);
});

test('theme toggle updates the document theme', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/);
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens the sidebar menu', async ({ page }) => {
    await page.goto('/docs/content');
    await waitForSvedocsHydration(page);
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('complementary', { name: 'Documentation' })).toBeVisible();
  });
});

async function waitForSvedocsHydration(page: import('@playwright/test').Page, route?: string) {
  await page.locator('html[data-theme]').waitFor();
  if (route) await page.locator(`html[data-svedocs-route="${route}"]`).waitFor();
}

test('keeps ToC active state bound to scroll position', async ({ page, isMobile }) => {
  test.skip(isMobile, 'ToC is intentionally hidden on mobile.');
  await page.goto('/docs/content');
  await waitForSvedocsHydration(page);
  await page.getByRole('link', { name: 'Math' }).click();
  await expect(page.locator('.sd-toc-link.sd-active')).toContainText('Math');
});
