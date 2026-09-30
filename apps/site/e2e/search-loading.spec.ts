import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile search loading' : 'desktop search loading', () => {
    test.use({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: mobile });

    for (const locale of ['en', 'zh']) {
      for (const slow of [false, true]) {
        test(`${slow ? 'shows feedback for slow loads' : 'skips feedback for fast loads'} in ${locale}`, async ({ page }, testInfo) => {
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const reducedMotion = mobile && locale === 'zh' && slow;
          await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
          const searchFile = process.env.SVEDOCS_E2E_PREVIEW
            ? Object.values(JSON.parse(await readFile('.svelte-kit/output/client/.vite/manifest.json', 'utf8')) as Record<string, { file: string; name?: string }>).find((entry) => entry.name === 'search')!.file
            : undefined;
          let release!: () => void;
          let requested!: () => void;
          const held = new Promise<void>((resolve) => { release = resolve; });
          const started = new Promise<void>((resolve) => { requested = resolve; });
          await page.route((url) => searchFile
            ? url.pathname.endsWith(searchFile)
            : decodeURIComponent(url.pathname).endsWith('virtual:svedocs/search'), async (route) => {
            requested();
            await held;
            await route.fulfill({ contentType: 'text/javascript', body: `export default ${JSON.stringify([
              { id: 'en', pageId: 'en', title: 'Configuration', content: 'Theme options.', url: '/docs/configuration', metadata: { locale: 'en', kind: 'doc' } },
              { id: 'zh', pageId: 'zh', title: '配置', content: '主题设置。', url: '/docs/zh/configuration', metadata: { locale: 'zh', kind: 'doc' } }
            ])};` });
          });
          // Hold index preparation after records arrive: recommendations need no index.
          await page.addInitScript(() => {
            window.Worker = class { postMessage() {} terminate() {} } as unknown as typeof Worker;
            // Pause the real size animation so intermediate geometry is deterministic.
            const animate = Element.prototype.animate;
            Element.prototype.animate = function (frames, options) {
              const animation = animate.call(this, frames, options);
              if (typeof options === 'object' && options.id === 'svedocs-search-resize') {
                animation.pause();
                animation.currentTime = 0;
              }
              return animation;
            };
          });
          await page.goto(locale === 'zh' ? '/docs/zh/configuration' : '/docs/configuration', { waitUntil: 'networkidle' });
          if (!mobile && locale === 'en') await page.addStyleTag({ content: 'html { font-size: 17.5px; }' });
          await page.clock.install();
          await page.clock.pauseAt(new Date());
          const trigger = page.locator(mobile ? '.sd-mobile-search-button' : '.sd-search-trigger');
          const dialog = page.locator('.sd-search-dialog');
          await trigger.click();
          await started;
          await expect(page.getByRole('combobox')).toBeFocused();
          await expect(dialog.getByRole('listbox')).toHaveAttribute('aria-busy', 'true');
          await expect(dialog.locator('.sd-empty-state')).toHaveCount(0);
          const heightBefore = await dialog.evaluate((node) => node.clientHeight);

          await page.clock.runFor(499);
          if (slow) {
            // Closing cancels the delay; reopening starts a fresh waiting period.
            await page.getByRole('combobox').press('Escape');
            await page.clock.runFor(600);
            await expect(dialog).toHaveCount(0);
            await trigger.click();
            await page.clock.runFor(499);
            await expect(dialog.getByRole('status')).toHaveCount(0);
            await page.clock.runFor(1);
            await expect(dialog.getByRole('status')).toHaveText(locale === 'zh' ? '正在加载搜索索引...' : 'Loading search index...');
            expect(await dialog.evaluate((node) => node.clientHeight)).toBe(heightBefore);
          } else {
            await expect(dialog.getByRole('status')).toHaveCount(0);
          }
          release();
          await expect(dialog.getByRole('option')).toHaveCount(1);
          await expect(dialog.getByRole('option')).toContainText(locale === 'zh' ? '配置' : 'Configuration');
          const region = dialog.getByRole('listbox');
          const content = dialog.locator('.sd-search-content');
          await expect(region).toHaveAttribute('aria-busy', 'false');
          if (reducedMotion) {
            await expect.poll(() => region.evaluate((node) => getComputedStyle(node).height)).toBe(await content.evaluate((node) => getComputedStyle(node).height));
            expect(await region.evaluate((node) => node.getAnimations().length)).toBe(0);
          } else {
            await expect.poll(() => region.evaluate((node) => node.getAnimations().some((animation) => animation.id === 'svedocs-search-resize'))).toBe(true);
            const targetHeight = await content.evaluate((node) => Number.parseFloat(getComputedStyle(node).height));
            const initialHeight = await region.evaluate((node) => Number.parseFloat(getComputedStyle(node).height));
            expect(initialHeight).toBeLessThan(targetHeight);
            await region.evaluate((node) => { node.getAnimations()[0]!.currentTime = 60; });
            const intermediateHeight = await region.evaluate((node) => Number.parseFloat(getComputedStyle(node).height));
            expect(intermediateHeight).toBeGreaterThan(initialHeight);
            expect(intermediateHeight).toBeLessThan(targetHeight);

            // A query arriving mid-transition must shrink from the current height.
            await page.getByRole('combobox').fill('unmatched-query');
            await expect(dialog.getByRole('option')).toHaveCount(0);
            await expect.poll(() => region.evaluate((node) => (node.getAnimations()[0]?.effect as KeyframeEffect | null | undefined)?.getKeyframes().at(-1)?.height)).toBe(`${initialHeight}px`);
            expect(await region.evaluate((node) => Number.parseFloat(getComputedStyle(node).height))).toBeCloseTo(intermediateHeight, 1);
            await region.evaluate((node) => { node.getAnimations()[0]!.currentTime = 60; });
            const shrinkingHeight = await region.evaluate((node) => Number.parseFloat(getComputedStyle(node).height));
            expect(shrinkingHeight).toBeLessThan(intermediateHeight);
            expect(shrinkingHeight).toBeGreaterThan(initialHeight);
            await region.evaluate((node) => { node.getAnimations()[0]!.finish(); });
            expect(await region.evaluate((node) => Number.parseFloat(getComputedStyle(node).height))).toBeCloseTo(initialHeight, 1);

            await page.getByRole('combobox').fill('');
            await expect(dialog.getByRole('option')).toHaveCount(1);
            await expect.poll(() => region.evaluate((node) => (node.getAnimations()[0]?.effect as KeyframeEffect | null | undefined)?.getKeyframes().at(-1)?.height)).toBe(`${targetHeight}px`);
            await region.evaluate((node) => { node.getAnimations()[0]!.finish(); });
            expect(await region.evaluate((node) => Number.parseFloat(getComputedStyle(node).height))).toBeCloseTo(targetHeight, 1);
          }
          await page.clock.runFor(500);
          await expect(dialog.getByRole('status')).toHaveCount(0);
          await expect(dialog.locator('.sd-empty-state')).toHaveCount(0);

          // Closing and reopening retains recommendations without a background status row.
          await page.getByRole('combobox').press('Escape');
          await expect(trigger).toBeFocused();
          await trigger.click();
          await page.clock.runFor(500);
          await expect(dialog.getByRole('option')).toHaveCount(1);
          await expect(dialog.getByRole('status')).toHaveCount(0);
          await testInfo.attach(`recommendations-${locale}`, { body: await page.screenshot(), contentType: 'image/png' });
          expect(errors).toEqual([]);
        });
      }
    }
  });
}
