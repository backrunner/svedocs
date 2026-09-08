import { expect, test } from '@playwright/test';

for (const [locale, route, anchor, copyLabel, viewLabel] of [
  ['en', '/', 'build-with-an-agent', 'Copy prompt', 'Read the full prompt'],
  ['zh', '/zh', '让-agent-来搭建', '复制 prompt', '查看完整 prompt']
] as const) {
  test(`copies the complete ${locale} prompt and provides the same text for agents`, async ({ page, context, request }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', route);
    await page.locator(`a[href="#${anchor}"]`).click();
    const section = page.locator('.agent-section');
    await expect(section).toBeInViewport();
    await section.getByRole('button', { name: copyLabel, exact: true }).click();
    await expect(section.getByRole('status')).toContainText(locale === 'en' ? 'Copied' : '已复制');
    const response = await request.get(`/prompts/build-docs.${locale}.txt`);
    expect(response.ok()).toBe(true);
    const prompt = (await response.text()).trim();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(prompt);
    expect(prompt).toContain('https://github.com/backrunner/svedocs/tree/main/skills');
    for (const skill of ['use-svedocs', 'configure-svedocs', 'customize-svedocs-theme', 'build-svedocs-landing']) {
      expect(prompt).toContain(skill);
    }
    await section.getByText(viewLabel, { exact: true }).click();
    await expect(section.getByRole('textbox')).toHaveValue(prompt);
  });

  test(`keeps the ${locale} prompt readable without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    try {
      const page = await context.newPage();
      await page.goto(route);
      const section = page.locator('.agent-section');
      await section.getByText(viewLabel, { exact: true }).click();
      await expect(section.getByRole('textbox')).toBeVisible();
      await expect(section.getByRole('textbox')).toHaveValue(/svedocs check --strict/);
      await section.locator('a[href$=".txt"]').click();
      await expect(page.locator('body')).toContainText('https://github.com/backrunner/svedocs/tree/main/skills');
    } finally { await context.close(); }
  });
}

test('offers selected text when clipboard access fails on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => { throw new Error('Clipboard unavailable'); } }
    });
  });
  await page.goto('/zh');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/zh');
  await page.getByRole('button', { name: '复制 prompt', exact: true }).click();
  const field = page.locator('#agent-prompt');
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();
  await expect(page.getByRole('status')).toContainText('请在下方选中并复制完整 prompt');
  expect(await field.evaluate((element: HTMLTextAreaElement) => element.selectionEnd - element.selectionStart)).toBe((await field.inputValue()).length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('switches the prompt language with the homepage locale', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', '/');
  await page.getByRole('button', { name: /^(Locale|Language)$/ }).click();
  await page.getByRole('menuitemradio', { name: '中文' }).click();
  await expect(page).toHaveURL(/\/zh\/?$/);
  await expect(page.getByRole('button', { name: '复制 prompt', exact: true })).toBeVisible();
  await expect(page.locator('#agent-prompt')).toHaveValue(/^请基于当前工作区/);
});
