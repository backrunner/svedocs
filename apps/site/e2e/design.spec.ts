import { expect, test } from '@playwright/test';

test('keeps translated navigation at the same depth', async ({ page }) => {
  for (const [path, titles] of [
    ['/docs/configuration', ['Quick Start', 'Installation', 'Writing', 'Configuration', 'Integrations', 'Reference']],
    ['/docs/zh/configuration', ['快速开始', '安装', '写作', '配置', '集成', '参考']]
  ] as const) {
    await page.goto(path);
    const items = page.locator('.sd-sidebar .sd-sidebar-list[data-depth="0"] > li');
    await expect(items).toHaveCount(6);
    expect(await items.evaluateAll((nodes) => nodes.map((node) => node.querySelector('summary, a')?.textContent?.trim()))).toEqual(titles);
  }
});

test('ignores IME confirmation in search and Ask AI', async ({ page }) => {
  await page.goto('/docs/zh');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/zh');
  await page.getByRole('button', { name: '搜索文档', exact: true }).click();
  const search = page.getByRole('combobox');
  await search.fill('主题');
  await expect(page.getByRole('option').first()).toBeVisible();
  for (const init of [{ isComposing: true }, { keyCode: 229 }]) {
    await search.evaluate((node, init) => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init })), init);
    await expect(search).toHaveValue('主题');
    await expect(page).toHaveURL(/\/docs\/zh\/?$/);
  }
  await search.press('Enter');
  await expect(page).toHaveURL(/configuration\/theme/);
  await page.getByRole('button', { name: '问 AI', exact: true }).click();
  const input = page.locator('.sd-chat-composer textarea');
  await input.fill('如何配置主题');
  for (const init of [{ isComposing: true }, { keyCode: 229 }]) {
    await input.evaluate((node, init) => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init })), init);
    await expect(input).toHaveValue('如何配置主题');
    await expect(page.locator('.sd-chat-bubble[data-role="user"]')).toHaveCount(0);
  }
  await input.press('Enter');
  await expect(page.locator('.sd-chat-bubble[data-role="user"]')).toHaveCount(1);
});

test('offers search and a working outline without opening the mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/docs/zh/configuration');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/zh/configuration');
  const menu = page.getByRole('button', { name: '打开菜单', exact: true });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  const trigger = page.locator('.sd-mobile-search-button');
  await trigger.click();
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.locator('.sd-mobile-toc summary').click();
  await page.locator('.sd-mobile-toc').getByRole('link', { name: '主题', exact: true }).click();
  await expect(page).toHaveURL(/#%E4%B8%BB%E9%A2%98$/);
  await expect(page.locator('.sd-mobile-toc')).not.toHaveAttribute('open', '');
  await expect(page.getByRole('heading', { name: '主题 链接到此章节', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('uses a nonmodal desktop AI panel and a modal mobile panel', async ({ page }) => {
  await page.goto('/docs/zh');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/zh');
  await page.getByRole('button', { name: '问 AI', exact: true }).click();
  const panel = page.getByRole('dialog', { name: '问 AI' });
  await expect(panel).toHaveAttribute('aria-modal', 'false');
  await page.locator('.sd-sidebar').getByRole('link', { name: '安装', exact: true }).click();
  await expect(page).toHaveURL(/installation\/?$/);
  await expect(panel).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  expect(await panel.evaluate((node) => node.matches(':modal'))).toBe(true);
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await panel.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
});

test('closes only the top dialog and preserves the underlying mobile panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/docs/zh');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/zh');
  await page.getByRole('button', { name: '问 AI', exact: true }).click();
  const composer = page.locator('.sd-chat-composer textarea');
  await expect(composer).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(composer).toBeFocused();
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
});

test('restores the original triggers after repeated dialog opening', async ({ page }) => {
  await page.goto('/docs/zh');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/docs/zh');
  const trigger = page.getByRole('button', { name: '搜索文档', exact: true });
  await trigger.click();
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();

  const askTrigger = page.getByRole('button', { name: '问 AI', exact: true });
  await askTrigger.click();
  await expect(page.locator('.sd-chat-composer textarea')).toBeFocused();
  await page.evaluate(() => window.dispatchEvent(new Event('svedocs:open-ai')));
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(askTrigger).toBeFocused();
});
