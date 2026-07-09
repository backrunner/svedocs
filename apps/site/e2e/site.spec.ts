import { expect, test, type APIResponse } from '@playwright/test';

test('serves the official home and docs entry', async ({ request }) => {
  const home = await request.get('/');
  expect(home.ok()).toBe(true);
  await expectResponseToContain(home, [
    'svedocs',
    'Read docs',
    'rel="canonical" href="https://svedocs.dev/"',
    'hreflang="zh-CN" href="https://svedocs.dev/zh"',
    'hreflang="x-default" href="https://svedocs.dev/"',
    'property="og:locale" content="en"',
    '"inLanguage":"en"'
  ]);

  const zhHome = await request.get('/zh');
  expect(zhHome.ok()).toBe(true);
  await expectResponseToContain(zhHome, [
    '用一个集成框架包构建边缘优先的 SvelteKit 文档站。',
    '阅读文档',
    '文档入口',
    'rel="canonical" href="https://svedocs.dev/zh"',
    'hreflang="en" href="https://svedocs.dev/"',
    'hreflang="zh-CN" href="https://svedocs.dev/zh"',
    'hreflang="x-default" href="https://svedocs.dev/"',
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
    'rel="canonical" href="https://svedocs.dev/docs/zh"',
    'hreflang="en" href="https://svedocs.dev/docs"',
    'hreflang="zh-CN" href="https://svedocs.dev/docs/zh"',
    'hreflang="x-default" href="https://svedocs.dev/docs"',
    'property="og:locale" content="zh_CN"',
    '"inLanguage":"zh-CN"'
  ]);
});

test('localizes interactive controls on zh docs pages', async ({ page }) => {
  await page.goto('/docs/zh');

  await expect(page.getByRole('button', { name: '搜索文档' })).toBeVisible();
  await expect(page.getByRole('button', { name: '问 AI' })).toBeVisible();
  await expect(page.getByLabel('本页内容')).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('button', { name: '回到顶部' })).toBeVisible();
});

async function expectResponseToContain(response: APIResponse, texts: string[]) {
  const body = await response.text();
  for (const text of texts) {
    expect(body).toContain(text);
  }
}
