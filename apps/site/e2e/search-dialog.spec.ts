import { expect, test } from '@playwright/test';

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile search' : 'desktop search', () => {
    test.use({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: mobile });

    for (const locale of ['en', 'zh']) {
      test(`closes by button and backdrop in ${locale}`, async ({ page }, testInfo) => {
        const path = locale === 'zh' ? '/docs/zh/configuration' : '/docs/configuration';
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-svedocs-route', path);
        const trigger = page.locator(mobile ? '.sd-mobile-search-button' : '.sd-search-trigger');
        const dialog = page.getByRole('dialog', { name: locale === 'zh' ? '搜索文档' : 'Search documentation', exact: true });
        const close = dialog.getByRole('button', { name: locale === 'zh' ? '关闭搜索' : 'Close search', exact: true });

        for (const method of ['button', 'backdrop']) {
          await page.emulateMedia({ colorScheme: method === 'button' ? 'light' : 'dark' });
          if (mobile) await trigger.tap();
          else await trigger.click();
          await expect(page.getByRole('combobox')).toBeFocused();
          await expect.poll(() => dialog.evaluate((node) => node.matches(':modal'))).toBe(true);
          await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
          await expect(close).toBeInViewport();
          await expect.poll(async () => (await close.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44);
          await expect.poll(async () => (await close.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

          // An empty result region is inside the dialog and must not dismiss it.
          await page.getByRole('combobox').fill('qzxqzxqzxqzxqzxqzxqzx');
          const empty = dialog.locator('.sd-empty-state').last();
          await expect(empty).toHaveText(locale === 'zh' ? '还没有匹配的文档。' : 'No matching docs yet.');
          if (mobile) await empty.tap();
          else await empty.click();
          await expect(dialog).toBeVisible();
          await testInfo.attach(`${method}-${mobile ? 'mobile' : 'desktop'}-${locale}`, {
            body: await page.screenshot(), contentType: 'image/png'
          });

          if (method === 'button') {
            if (mobile) await close.tap();
            else await close.click();
          } else {
            // The dialog leaves a gutter on every side, including mobile.
            if (mobile) await page.touchscreen.tap(4, 4);
            else await page.mouse.click(4, 4);
          }
          await expect(dialog).toHaveCount(0);
          await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
          await expect(trigger).toBeFocused();
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
        }
      });
    }
  });
}
