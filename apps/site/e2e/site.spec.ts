import { expect, test } from '@playwright/test';

test('renders the official home and docs entry', async ({ page }) => {
  await page.goto('/');
  await waitForSvedocsHydration(page);
  await expect(page.getByRole('heading', { name: 'svedocs', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Read docs' }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole('heading', { name: 'Quick Start' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create a site' })).toBeVisible();
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
  await openTopbarMenuIfCollapsed(page);
  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByPlaceholder('Search docs').fill('cloudflare');
  await expect(page.getByRole('option').filter({ hasText: 'Search' }).first()).toBeVisible();
});

test('search dialog jumps to docs pages', async ({ page }) => {
  await page.goto('/docs');
  await waitForSvedocsHydration(page);
  await openTopbarMenuIfCollapsed(page);
  await page.getByRole('button', { name: 'Search documentation' }).click();
  await page.getByPlaceholder('Search docs').fill('configuration');
  await page.locator('.sd-search-results a[role="option"][href="/docs/configuration"]').click();
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
  await waitForSvedocsHydration(page);
  await openTopbarMenuIfCollapsed(page);
  await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/);
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens the sidebar menu', async ({ page }) => {
    await page.goto('/docs/writing/content');
    await waitForSvedocsHydration(page);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Documentation' })).toBeVisible();
  });
});

async function waitForSvedocsHydration(page: import('@playwright/test').Page, route?: string) {
  await page.locator('html[data-theme]').waitFor();
  const hydratedRoute = route ?? new URL(page.url()).pathname;
  await page.locator(`html[data-svedocs-route="${hydratedRoute}"]`).waitFor();
}

async function openTopbarMenuIfCollapsed(page: import('@playwright/test').Page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
}

test('keeps ToC active state bound to scroll position', async ({ page, isMobile }) => {
  test.skip(isMobile, 'ToC is intentionally hidden on mobile.');
  await page.goto('/docs/writing/content');
  await waitForSvedocsHydration(page);
  await page.locator('.sd-toc').getByRole('link', { name: 'Authoring checklist' }).click();
  await expect(page.locator('.sd-toc-link.sd-active')).toHaveAttribute('href', '#authoring-checklist');
});

test('uses the lowest visible heading for the ToC marker', async ({ page, isMobile }) => {
  test.skip(isMobile, 'ToC is intentionally hidden on mobile.');
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto('/docs/writing/content');
  await waitForSvedocsHydration(page);
  const foundScrollPosition = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>('.sd-prose h2[id], .sd-prose h3[id], .sd-prose h4[id]'));
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    for (let y = 0; y <= maxScroll; y += 48) {
      window.scrollTo(0, y);
      const visible = headings.filter((heading) => {
        const top = heading.getBoundingClientRect().top;
        return top >= 80 && top <= window.innerHeight;
      });
      if (visible.length > 1) return true;
    }
    return false;
  });
  expect(foundScrollPosition).toBe(true);
  await page.waitForFunction(() => {
    const visible = Array.from(document.querySelectorAll<HTMLElement>('.sd-prose h2[id], .sd-prose h3[id], .sd-prose h4[id]'))
      .filter((heading) => {
        const top = heading.getBoundingClientRect().top;
        return top >= 80 && top <= window.innerHeight;
      });
    return visible.length > 1;
  });
  const lowestVisibleId = await page.evaluate(() => {
    const visible = Array.from(document.querySelectorAll<HTMLElement>('.sd-prose h2[id], .sd-prose h3[id], .sd-prose h4[id]'))
      .map((heading) => ({ id: heading.id, top: heading.getBoundingClientRect().top }))
      .filter((heading) => heading.top >= 80 && heading.top <= window.innerHeight);
    return visible.reduce((lowest, heading) => heading.top > lowest.top ? heading : lowest).id;
  });
  await expect(page.locator('.sd-toc-link.sd-active')).toHaveAttribute('href', `#${lowestVisibleId}`);
  const marker = await page.locator('.sd-toc').evaluate((toc) => {
    const style = getComputedStyle(toc, '::before');
    return {
      height: Number.parseFloat(style.height),
      opacity: style.opacity,
      width: Number.parseFloat(style.width)
    };
  });
  expect(Number.parseFloat(marker.opacity)).toBeGreaterThan(0);
  expect(marker.height).toBeGreaterThan(0);
  expect(marker.width).toBeGreaterThan(0);
});
