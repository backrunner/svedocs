import type { Handle, RequestEvent, ResolveOptions } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { resolveSvedocsConfig } from '../src/core.js';
import { createSvedocsHtmlHandle, getSvedocsDocumentAttributes } from '../src/routes.js';
import { createFixturePage } from '../src/testing.js';

const config = resolveSvedocsConfig({ i18n: { defaultLocale: 'en', locales: ['en', { code: 'zh', hreflang: 'zh-CN', path: 'cn' }, { code: 'ar', dir: 'rtl' }] } });
const pages = [createFixturePage({ routePath: '/docs', locale: 'en' }), createFixturePage({ routePath: '/docs/cn', locale: 'zh' }),
  createFixturePage({ routePath: '/ar', kind: 'page', locale: 'ar' }), createFixturePage({ routePath: '/cn', kind: 'page', locale: 'en' })];
const options = { config, pages };

describe('SSR document attributes', () => {
  it.each([
    ['/docs', 'en', 'ltr'], ['/docs/cn/', 'zh-CN', 'ltr'], ['/ar', 'ar', 'rtl'],
    ['/docs/ar/missing', 'ar', 'rtl'], ['/cn/missing', 'zh-CN', 'ltr'], ['/missing', 'en', 'ltr'],
    ['/cn', 'en', 'ltr'], ['/docs/%63n', 'zh-CN', 'ltr'], ['/docs/%zz', 'en', 'ltr']
  ])('resolves %s to %s/%s', (pathname, lang, dir) => {
    expect(getSvedocsDocumentAttributes(options, pathname)).toEqual({ lang, dir });
  });

  async function render(chunks: string[], pathname = '/ar') {
    const handle = createSvedocsHtmlHandle(options);
    const event = { url: new URL(pathname, 'https://example.test') } as RequestEvent;
    const resolve: Parameters<Handle>[0]['resolve'] = async (_, opts?: ResolveOptions) => {
      let body = '';
      for (const [index, html] of chunks.entries()) body += await opts?.transformPageChunk?.({ html, done: index === chunks.length - 1 }) ?? html;
      return new Response(body, { headers: { 'content-type': 'text/html' } });
    };
    return (await handle({ event, resolve })).text();
  }

  it('replaces attributes before JavaScript and retains unrelated attributes and body text', async () => {
    expect(await render(['<!doctype html><html class="custom" lang=\'en\' dir=ltr><head></head><body>العربية</body></html>']))
      .toBe('<!doctype html><html class="custom" lang="ar" dir="rtl"><head></head><body>العربية</body></html>');
  });

  it('handles chunk boundaries and document output without an html element', async () => {
    expect(await render(['<!doctype html><ht', 'ml lang="en"', '><head>', '</head><body>Text</body></html>'], '/docs/cn'))
      .toBe('<!doctype html><html lang="zh-CN" dir="ltr"><head></head><body>Text</body></html>');
    expect(await render(['<main>', 'Content</main>'])).toBe('<main>Content</main>');
  });

  it('preserves quoted attribute values and skips commented html tags across chunks', async () => {
    const prefix = '<!doctype html><!-- Example: <html lang="en"> -->';
    const attributes = ' data-note="a > b lang=\'keep\'" data-dir=custom';
    const document = `${prefix}<HTML${attributes} LANG dir=\'ltr\'><body>Text</body></HTML>`;
    expect(await render([...document])).toBe(`${prefix}<HTML${attributes} lang="ar" dir="rtl"><body>Text</body></HTML>`);
  });
});
