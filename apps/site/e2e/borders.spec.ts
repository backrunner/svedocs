import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test.skip(!process.env.SVEDOCS_E2E_BORDERS, 'Requires the composed border fixtures');

for (const width of [1440, 390]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`composed defaults have one frame at ${width}px in ${colorScheme}`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, colorScheme });
      try {
        const page = await context.newPage();
        await page.goto('/docs/writing/content');
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await expect(page.getByTestId('article-frame')).toHaveCSS('border-top-width', '1px');
        await expect(page.locator('.sd-doc')).toHaveCSS('border-top-width', '0px');
        await expect(page.locator('.sd-doc')).toHaveCSS('box-shadow', 'none');
        // Also exercise the decorated default, where corner marks would duplicate the frame.
        await page.locator('.sd-root').evaluate((node) => { (node as HTMLElement).dataset.readingStyle = 'decorated'; });
        await expect(page.locator('.sd-doc-corner').first()).toBeHidden();
        await expect(page.locator('.sd-code').first()).toHaveCSS('border-top-width', '1px');
        await page.goto('/theme-preview');
        await expect(page.getByTestId('page-frame')).toHaveCSS('border-top-width', '1px');
        await expect(page.locator('main.sd-page')).toHaveCSS('border-top-width', '0px');
        const widget = page.getByTestId('custom-widget');
        await expect(widget).toHaveCSS('border-top-width', '1px');
        // Nested widgets may use their own top-level heading without the page title's sizing.
        await widget.locator('h2').evaluate((node) => {
          const heading = document.createElement('h1'); heading.textContent = node.textContent; node.replaceWith(heading);
        });
        await expect(widget.locator('h1')).toHaveCSS('font-size', '16px');
        await widget.locator('h1').evaluate((node) => {
          const heading = document.createElement('h2'); heading.textContent = node.textContent; node.replaceWith(heading);
        });
        for (const selector of ['pre', 'table', 'td', 'h2', 'p code']) {
          for (const edge of ['top', 'right', 'bottom', 'left']) {
            await expect(widget.locator(selector)).toHaveCSS(`border-${edge}-width`, '0px');
          }
        }
        await expect(widget.locator('.sd-button')).toHaveCSS('border-top-width', '1px');
        await widget.locator('.sd-button').focus();
        await expect(widget.locator('.sd-button')).toHaveCSS('outline-width', '2px');
        await expect(page.getByTestId('code-frame').locator('pre')).toHaveCSS('border-top-width', '0px');
        await expect(page.getByTestId('wrapped-code')).toHaveCSS('border-top-width', '1px');
        await expect(page.getByTestId('wrapped-code').locator('pre')).toHaveCSS('border-top-width', '0px');
        await expect(page.getByTestId('wrapped-code').locator('pre')).toHaveCSS('margin-top', '0px');
        await expect(page.getByTestId('utility-code')).toHaveCSS('border-top-width', '0px');
        const noShadow = await page.getByTestId('shadow-reference').evaluate((node) => getComputedStyle(node).boxShadow);
        await expect(page.getByTestId('utility-code')).toHaveCSS('box-shadow', noShadow);
        for (const selector of ['pre', 'table']) {
          const raw = page.getByTestId('markdown-defaults').locator(selector);
          await expect(raw).toHaveCSS('border-top-width', '1px');
          await raw.evaluate((node) => { (node as HTMLElement).dataset.sdFrame = 'none'; });
          await expect(raw).toHaveCSS('border-top-width', '0px');
          await expect(raw).toHaveCSS('box-shadow', 'none');
          await raw.evaluate((node) => { delete (node as HTMLElement).dataset.sdFrame; });
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
        await mkdir(path.resolve('../../artifacts/borders'), { recursive: true });
        await page.locator('main').screenshot({ path: path.resolve(`../../artifacts/borders/${width}-${colorScheme}.png`) });
      } finally { await context.close(); }
    });
  }
}

test('frame ownership is present in SSR without JavaScript, including error panels', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/docs/writing/content');
    await expect(page.locator('.sd-doc')).toHaveCSS('border-top-width', '0px');
    await expect(page.locator('.sd-doc .sd-code').first()).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('main')).toHaveCount(1);
    expect((await page.goto('/docs/border-test-missing'))?.status()).toBe(404);
    await expect(page.locator('.sd-error-panel')).toHaveCSS('border-top-width', '0px');
    await expect(page.getByTestId('page-frame')).toHaveCSS('border-top-width', '1px');
  } finally { await context.close(); }
});


test('minimal base CSS supports frame opt-out and application border overrides', async ({ page }) => {
  const base = await readFile(path.resolve('../../packages/svedocs/src/theme/base.css'), 'utf8');
  const frames = await readFile(path.resolve('../../packages/svedocs/src/theme/styles/frames.css'), 'utf8');
  const css = base.replace('@import "./styles/frames.css" layer(base);', `@layer base {${frames}}`);
  await page.setContent(`<style>@layer base, utilities; ${css}
    @layer utilities { .border-0 { border-width: 0; } }
    .custom-panel { border: 0; }
    </style>
    <section class="sd-error-panel" id="default-panel">Default</section>
    <section class="sd-error-panel" data-sd-frame="none" id="unframed-panel">Unframed</section>
    <section class="sd-error-panel custom-panel" id="custom-panel">Custom</section>
    <a class="sd-link-card border-0" id="utility-link">Link</a>`);
  await expect(page.locator('#default-panel')).toHaveCSS('border-top-width', '1px');
  for (const selector of ['#unframed-panel', '#custom-panel', '#utility-link']) {
    await expect(page.locator(selector)).toHaveCSS('border-top-width', '0px');
  }
});
