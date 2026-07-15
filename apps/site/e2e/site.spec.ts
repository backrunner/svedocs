import { expect, test, type APIResponse } from '@playwright/test';

test('serves the official home and docs entry', async ({ request }) => {
  const home = await request.get('/');
  expect(home.ok()).toBe(true);
  await expectResponseToContain(home, [
    'svedocs',
    'Read docs',
    'rel="canonical" href="https://svedocs.pwp.sh/"',
    'hreflang="zh-CN" href="https://svedocs.pwp.sh/zh"',
    'hreflang="x-default" href="https://svedocs.pwp.sh/"',
    'property="og:locale" content="en"',
    '"inLanguage":"en"'
  ]);

  const zhHome = await request.get('/zh');
  expect(zhHome.ok()).toBe(true);
  await expectResponseToContain(zhHome, [
    '为 Cloudflare 或静态托管构建 SvelteKit 文档站。',
    '阅读文档',
    '文档入口',
    'rel="canonical" href="https://svedocs.pwp.sh/zh"',
    'hreflang="en" href="https://svedocs.pwp.sh/"',
    'hreflang="zh-CN" href="https://svedocs.pwp.sh/zh"',
    'hreflang="x-default" href="https://svedocs.pwp.sh/"',
    'property="og:locale" content="zh_CN"',
    'property="og:locale:alternate" content="en"',
    '"inLanguage":"zh-CN"'
  ]);

  const docs = await request.get('/docs');
  expect(docs.ok()).toBe(true);
  await expectResponseToContain(docs, ['Quick Start', 'Create a site']);

  const zhDocs = await request.get('/docs/zh');
  expect(zhDocs.ok()).toBe(true);
  await expectResponseToContain(zhDocs, [
    '快速开始',
    '搜索',
    '问 AI',
    '本页内容',
    '编辑此页',
    'rel="canonical" href="https://svedocs.pwp.sh/docs/zh"',
    'hreflang="en" href="https://svedocs.pwp.sh/docs"',
    'hreflang="zh-CN" href="https://svedocs.pwp.sh/docs/zh"',
    'hreflang="x-default" href="https://svedocs.pwp.sh/docs"',
    'property="og:locale" content="zh_CN"',
    '"inLanguage":"zh-CN"'
  ]);
});

test('localizes interactive controls on zh docs pages', async ({ page }) => {
  await page.goto('/docs/zh');

  await expect(page).toHaveURL(/\/docs\/zh$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('a.sd-brand')).toHaveAttribute('href', '/zh');
  await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '配置' })).toHaveAttribute('href', '/docs/zh/configuration');
  await expect(page.getByRole('button', { name: '搜索文档' })).toBeVisible();
  await expect(page.getByRole('button', { name: '问 AI' })).toBeVisible();
  await expect(page.getByLabel('本页内容')).toBeVisible();

  const sectionHeading = page.getByRole('heading', { name: '创建站点 链接到此章节' });
  const headingAnchor = sectionHeading.getByRole('link', { name: '链接到此章节' });
  await expect(headingAnchor).toHaveCSS('opacity', '0');
  await sectionHeading.hover();
  await expect(headingAnchor).toHaveCSS('opacity', '1');
  await expect(headingAnchor.locator('svg')).toBeVisible();
  await expect(headingAnchor).not.toHaveText('#');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('button', { name: '回到顶部' })).toBeVisible();
});

test('keeps localized shell and recovery links on zh error routes', async ({ page }) => {
  await page.goto('/docs/zh/not-a-real-page');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('heading', { name: '页面未找到' })).toBeVisible();
  await expect(page.getByText('这个文档集中没有你正在查找的页面。')).toBeVisible();
  await expect(page.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/zh');
  await expect(page.getByRole('link', { name: '文档' }).last()).toHaveAttribute('href', '/docs/zh');
});

async function expectResponseToContain(response: APIResponse, texts: string[]) {
  const body = await response.text();
  for (const text of texts) {
    expect(body).toContain(text);
  }
}
