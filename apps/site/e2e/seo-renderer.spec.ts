import { expect, test } from '@playwright/test';

test.skip(!process.env.SVEDOCS_E2E_SEO, 'Requires the custom SEO renderer fixture');

test('custom renderer owns the complete SEO head during SSR and navigation', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/docs/zh/integrations/seo-og');
    await expect(page).toHaveTitle(/^Custom SEO: /);
    await expect(page.locator('meta[name="custom-language"]')).toHaveAttribute('content', 'zh-CN');
    await expect(page.locator('meta[name="custom-canonical"]')).toHaveAttribute('content', 'https://svedocs.pwp.sh/docs/zh/integrations/seo-og');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await expect(page.locator('main')).toContainText('元数据');
  } finally { await context.close(); }
  const page = await browser.newPage({ baseURL });
  try {
    await page.goto('/docs/integrations/seo-og');
    await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/integrations/seo-og');
    await page.locator('.sd-scope-trigger').click();
    await page.locator('a[href="/docs/zh/integrations/seo-og"]').first().click();
    await expect(page.locator('meta[name="custom-language"]')).toHaveAttribute('content', 'zh-CN');
    await expect(page.locator('meta[name="custom-language"]')).toHaveCount(1);
    await expect(page).toHaveTitle(/^Custom SEO: /);
  } finally { await page.close(); }
});
