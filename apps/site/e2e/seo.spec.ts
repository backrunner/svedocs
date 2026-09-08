import { expect, test } from '@playwright/test';

test('search crawlers receive HTML and complete SEO tags without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL,
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });
  try {
    const page = await context.newPage();
    for (const route of ['/', '/zh', '/docs/integrations/seo-og', '/docs/zh/integrations/seo-og']) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-type']).toContain('text/html');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.sd-doc-meta span')).toHaveCount(0);
      await expect(page.locator('meta[property="article:modified_time"]')).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`https://svedocs.pwp.sh${route}/?$`));
      await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content', 'image/png');
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
      await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /.+/);
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      const structuredData = schemas.map((text) => JSON.parse(text));
      if (route.startsWith('/docs')) {
        expect(structuredData.map((schema) => schema['@type'])).toContain('BreadcrumbList');
        expect(structuredData.find((schema) => schema['@type'] === 'TechArticle').author['@type']).toBe('Organization');
      } else {
        expect(structuredData.map((schema) => schema['@type'])).toEqual(expect.arrayContaining(['WebSite', 'Organization', 'WebPage']));
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /SvelteKit.+Agent Skills/);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow,max-image-preview:large');
        await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
        await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://svedocs.pwp.sh/brand/og-home-${route === '/' ? 'en' : 'zh'}.png`);
        await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', 'https://svedocs.pwp.sh/');
        await expect(page.locator('link[hreflang="zh-CN"]')).toHaveAttribute('href', /https:\/\/svedocs.pwp.sh\/zh\/?$/);
        expect(structuredData.find((schema) => schema['@type'] === 'WebSite').inLanguage).toBe(route === '/' ? 'en' : 'zh-CN');
      }
      const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', imageUrl!);
      const image = await context.request.get(new URL(imageUrl!).pathname);
      expect(image.status()).toBe(200);
      expect(image.headers()['content-type']).toContain('image/png');
      expect(image.headers()['cache-control'] ?? '').not.toContain('immutable');
      const bytes = await image.body();
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
    }
  } finally { await context.close(); }
});

test('localized homepage titles explain the product and missing routes remain 404', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('svedocs — SvelteKit documentation for Cloudflare and static hosting');
  await page.goto('/zh');
  await expect(page).toHaveTitle('svedocs — 基于 SvelteKit 的文档框架');
  const response = await page.goto('/docs/seo-missing-page');
  expect(response?.status()).toBe(404);
});
