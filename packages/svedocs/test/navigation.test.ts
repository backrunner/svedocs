import { describe, expect, it } from 'vitest';
import { createPageTree, flattenPageTree, wirePrevNext } from '../src/core/navigation.js';
import { createThemeContext } from '../src/theme/controllers/context.js';
import { resolveSvedocsConfig } from '../src/core/config.js';
import { createFixturePage } from '../src/testing.js';

const config = resolveSvedocsConfig({ i18n: { defaultLocale: 'en', locales: ['en', 'zh'] } });
const pages = ['en', 'zh'].flatMap((locale) => [
  ['/docs', 'Start', 1],
  ['/docs/install', 'Install', 2],
  ['/docs/guides', 'Guides', 3],
  ['/docs/guides/deploy', 'Deploy', 1]
].map(([scopePath, title, order]) => createFixturePage({
  id: `${locale}-${title}`, locale, title: String(title), order: Number(order),
  scopePath: String(scopePath),
  routePath: String(scopePath).replace('/docs', locale === 'en' ? '/docs' : '/docs/zh')
})));

describe('navigation scope', () => {
  it('keeps unlocalized navigation when resolving the default language for an error page', () => {
    const unlocalized = pages.filter((page) => page.locale === 'en').map(({ locale: _, ...page }) => page);
    const context = createThemeContext({ config: resolveSvedocsConfig(), pages: unlocalized, localeCode: 'en' });
    expect(flattenPageTree(context.tree).map((item) => item.path).sort()).toEqual(unlocalized.map((page) => page.routePath).sort());
  });

  it('applies an explicit language override to navigation as well as translations', () => {
    const context = createThemeContext({ config, pages, page: pages[0]!, localeCode: 'zh' });
    expect(context.localeCode).toBe('zh');
    expect(flattenPageTree(context.tree).map((item) => item.path).sort()).toEqual(pages.filter((page) => page.locale === 'zh').map((page) => page.routePath).sort());
  });

  it('keeps the same hierarchy in each language and preserves localized links', () => {
    for (const locale of ['en', 'zh']) {
      const tree = createPageTree(pages.filter((page) => page.locale === locale));
      expect(tree.map((item) => item.title)).toEqual(['Start', 'Install', 'Guides']);
      expect(tree[0]?.children).toBeUndefined();
      expect(tree[2]?.children?.[0]?.path).toBe(locale === 'en' ? '/docs/guides/deploy' : '/docs/zh/guides/deploy');
    }
  });

  it('keeps every locale in the manifest without crossing languages in prev/next', () => {
    const tree = createPageTree(pages);
    expect(flattenPageTree(tree).map((item) => item.path).sort()).toEqual(pages.map((page) => page.routePath).sort());
    wirePrevNext(pages, tree);
    for (const locale of ['en', 'zh']) {
      expect(pages.find((page) => page.id === `${locale}-Install`)?.next?.path).toBe(pages.find((page) => page.id === `${locale}-Guides`)?.routePath);
      expect(pages.find((page) => page.id === `${locale}-Start`)?.prev).toBeUndefined();
    }
  });

  it('ignores custom locale prefixes and keeps directory groups without an index', () => {
    const localized = pages.filter((page) => page.locale === 'en' && page.title !== 'Guides')
      .map((page) => ({ ...page, routePath: page.routePath.replace('/docs', '/docs/english') }));
    const tree = createPageTree(localized);
    const group = tree.find((item) => item.children?.length);
    expect(tree).toHaveLength(3);
    expect(group?.title).toBe('Guides');
    expect(group?.path).toBeUndefined();
    expect(group?.children?.[0]?.path).toBe('/docs/english/guides/deploy');
  });

  it('scopes the supplied tree while preserving custom ordering and labels', () => {
    const tree = createPageTree(pages).reverse().map((item) => ({ ...item, title: `Custom ${item.title}` }));
    const context = createThemeContext({ config, pages, tree, page: pages.find((page) => page.id === 'zh-Install')! });
    expect(context.tree.map((item) => item.title)).toEqual(['Custom Guides', 'Custom Install', 'Custom Start']);
    expect(flattenPageTree(context.tree).every((item) => item.path?.startsWith('/docs/zh'))).toBe(true);
  });
});
