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

test('searches beta docs and falls back Ask AI without remote bindings', async ({ page }) => {
  await page.goto('/docs');

  const searchDialog = page.getByRole('dialog', { name: 'Search documentation' });
  await expect(async () => {
    await page.getByRole('button', { name: 'Search documentation' }).click();
    await expect(searchDialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 8_000 });
  const search = page.getByRole('combobox', { name: 'Search query' });
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await search.fill('beta channel');
  await page.getByRole('option', { name: /Create a new project/ }).click();
  await expect(page).toHaveURL(/\/docs\/installation#create-a-new-project$/);

  await page.getByRole('button', { name: 'Ask AI' }).click();
  const askDialog = page.getByRole('dialog', { name: 'Ask AI' });
  await askDialog.getByRole('textbox', { name: 'Ask anything about svedocs' }).fill('How can I use the beta channel?');
  await askDialog.getByRole('button', { name: 'Send' }).click();

  await expect(askDialog.getByText(/I found \d+ relevant sources? in this documentation/)).toBeVisible();
  await expect(askDialog.getByRole('link', { name: 'Installation' })).toBeVisible();
  await expect(askDialog.getByText(/Ask AI returned 500/)).toHaveCount(0);
});

async function expectResponseToContain(response: APIResponse, texts: string[]) {
  const body = await response.text();
  for (const text of texts) {
    expect(body).toContain(text);
  }
}

test('loads custom content on demand and updates its theme context across locales', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => requests.push(decodeURIComponent(request.url())));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/');
  expect(requests.some((url) => url.includes('/SiteHome.svelte'))).toBe(true);
  expect(requests.some((url) => /ThemePreview\.svelte|FeatureLayout\.svelte|virtual:svedocs\/component\//.test(url))).toBe(false);

  await page.getByRole('link', { name: 'Theme preview' }).click();
  await expect(page.getByRole('heading', { name: 'A Svelte page of your own' })).toBeVisible();
  expect(requests.some((url) => url.includes('/ThemePreview.svelte'))).toBe(true);
  await page.getByRole('slider', { name: 'Corner radius' }).fill('16');
  await expect(page.locator('.preview')).toHaveCSS('border-radius', '16px');
  await page.getByRole('button', { name: /^(Locale|Language)$/ }).click();
  await page.getByRole('menuitemradio', { name: '中文' }).click();
  await expect(page).toHaveURL(/\/zh\/theme-preview$/);
  await expect(page.getByRole('heading', { name: '这是你自己的 Svelte 页面' })).toBeVisible();
  await expect(page.getByRole('link', { name: '查看主题文档' })).toHaveAttribute('href', '/docs/zh/configuration/theme');
  await expect(page.getByRole('slider', { name: '圆角' })).toHaveValue('16');
  await expect(page.getByText('svedocs · zh-CN', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('supports mobile navigation and persists the selected theme', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/zh');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/zh');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.getByRole('button', { name: '打开菜单' }).click();
  await expect(page.getByRole('button', { name: '关闭菜单' })).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.sd-theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '文档', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/zh$/);
  await expect(page.getByRole('button', { name: '打开菜单' })).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { name: '快速开始', exact: true })).toBeVisible();
});
