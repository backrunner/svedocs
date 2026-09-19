import { expect, test, type Page } from '@playwright/test';

test.skip(!process.env.SVEDOCS_E2E_INTEGRATIONS, 'Run with the isolated integration Vite config.');

async function mockProviders(page: Page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route('https://analytics.example.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: `window.umamiViews = []; window.umami = { track: (properties) => window.umamiViews.push(properties({})) };` }));
  await page.route('https://pagead2.googlesyndication.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: `window.adRequests = 0; window.adsbygoogle = { push: () => { window.adRequests++; document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])').forEach(el => el.setAttribute('data-adsbygoogle-status', 'done')); } };` }));
}

const events = (page: Page) => page.evaluate(() => {
  const target = window as unknown as { dataLayer?: ArrayLike<unknown>[]; umamiViews?: unknown[]; adRequests?: number };
  return { google: (target.dataLayer ?? []).map((entry) => Array.from(entry)), umami: target.umamiViews ?? [], ads: target.adRequests ?? 0 };
});

test('tracks initial load, client navigation and back once, renders theme ads, and serves verification assets', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mockProviders(page);
  await page.goto('/docs', { waitUntil: 'networkidle' });
  await expect.poll(async () => (await events(page)).umami.length).toBe(1);
  expect((await events(page)).google.filter((entry) => entry[1] === 'page_view')).toHaveLength(1);
  await expect(page.locator('.sd-google-ad')).toBeVisible();
  await expect.poll(async () => (await events(page)).ads).toBe(1);
  await page.locator('a[href="/docs/installation"]:visible, a[href="/docs/installation/"]:visible').first().click();
  await expect(page).toHaveURL(/\/docs\/installation\/?$/);
  await expect.poll(async () => (await events(page)).umami.length).toBe(2);
  expect((await events(page)).google.filter((entry) => entry[1] === 'conversion')).toEqual([
    ['event', 'conversion', { send_to: 'AW-123456789/installed' }]
  ]);
  await page.goBack();
  await expect.poll(async () => (await events(page)).umami.length).toBe(3);
  expect((await events(page)).google.filter((entry) => entry[1] === 'page_view')).toHaveLength(3);
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = `${location.pathname}?campaign=test`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  await expect.poll(async () => (await events(page)).umami.length).toBe(4);
  await page.evaluate(() => { location.hash = 'integration-anchor'; });
  await expect(page).toHaveURL(/#integration-anchor$/);
  expect((await events(page)).google.filter((entry) => entry[1] === 'page_view')).toHaveLength(4);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sd-google-ad')).toBeVisible();
  await expect(page.locator('script[data-svedocs-integration="google-tag"]')).toHaveCount(1);
  await expect(page.locator('script[data-svedocs-integration="umami"]')).toHaveCount(1);
  await expect(page.locator('script[data-svedocs-integration="google-adsense"]')).toHaveCount(1);
  expect(await (await request.get('/svedocs-indexnow-test.txt')).text()).toBe('svedocs-indexnow-test');
  expect(await (await request.get('/ads.txt')).text()).toContain('pub-1234567890123456');
  expect(errors).toEqual([]);
});

test('allows custom themes to render ads and signal conversions', async ({ page }) => {
  await mockProviders(page);
  await page.goto('/theme-preview', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Custom theme integration' })).toBeVisible();
  await expect.poll(async () => (await events(page)).google.filter((entry) => entry[1] === 'conversion').length).toBe(1);
  expect((await events(page)).google).toContainEqual(['event', 'conversion', {
    send_to: 'AW-123456789/custom', value: 5, currency: 'USD', transaction_id: 'test-transaction'
  }]);
  await expect(page.locator('ins[data-ad-slot="1234567890"]').first()).toBeAttached();
});

test('does not repeat a route conversion when only query parameters change', async ({ page }) => {
  await mockProviders(page);
  await page.goto('/docs/installation', { waitUntil: 'networkidle' });
  await expect.poll(async () => (await events(page)).umami.length).toBe(1);
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = `${location.pathname}?campaign=changed`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  await expect.poll(async () => (await events(page)).umami.length).toBe(2);
  expect((await events(page)).google.filter((entry) => entry[1] === 'page_view')).toHaveLength(2);
  expect((await events(page)).google.filter((entry) => entry[1] === 'conversion')).toHaveLength(1);
});

test('honors Do Not Track without requesting provider scripts', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { value: '1' }));
  await mockProviders(page);
  await page.goto('/docs', { waitUntil: 'networkidle' });
  await expect(page.locator('script[data-svedocs-integration]')).toHaveCount(0);
  await expect(page.locator('.sd-google-ad')).toHaveCount(0);
  expect(await events(page)).toEqual({ google: [], umami: [], ads: 0 });
});

test('keeps docs usable when providers are blocked', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/https:\/\/(www\.googletagmanager\.com|analytics\.example\.com|pagead2\.googlesyndication\.com)\//, (route) => route.abort());
  await page.goto('/docs', { waitUntil: 'networkidle' });
  await expect(page.locator('article h1')).toBeVisible();
  await page.locator('a[href="/docs/installation"]:visible, a[href="/docs/installation/"]:visible').first().click();
  await expect(page).toHaveURL(/\/docs\/installation\/?$/);
  expect(errors).toEqual([]);
});
