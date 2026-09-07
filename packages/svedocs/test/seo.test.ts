import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, utimes, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { resolveSvedocsConfig, loadSvedocsContent } from '../src/core.js';
import { createFixturePage } from '../src/testing.js';
import { createPageAlternates, createPageMetadata, createPageOgImageResponse, createOgSvg, createSitemapXml, createRssXml } from '../src/og.js';
import { createLlmsTxt, createPageMarkdownEntries, resolvePageMarkdown } from '../src/agent.js';

const config = resolveSvedocsConfig({ site: { name: 'Docs', url: 'https://example.test' }, seo: { rss: true },
  i18n: { defaultLocale: 'en', locales: [{ code: 'en', ogLocale: 'en_GB' }, { code: 'zh', hreflang: 'zh-CN' }] } });
const en = createFixturePage({ id: 'en', kind: 'doc', routePath: '/docs', scopePath: '/docs', locale: 'en', markdown: 'English' });
const zh = createFixturePage({ id: 'zh', kind: 'doc', routePath: '/docs/zh', scopePath: '/docs', locale: 'zh', title: '中文文档', markdown: '中文' });

describe('consistent indexing', () => {
  it.each(['noindex,follow', 'NONE', 'index, noindex', 'none nofollow'])('excludes %s in HTML and all discovery outputs', (robots) => {
    const excluded = { ...en, seo: { ...en.seo, robots } };
    const pages = [excluded, zh];
    expect(createPageAlternates(config, zh, pages).map((entry) => entry.lang)).toEqual(['zh-CN']);
    expect(createPageAlternates(config, excluded, pages)).toEqual([]);
    expect(createSitemapXml(config, pages)).not.toContain('<loc>https://example.test/docs</loc>');
    expect(createRssXml(config, pages)).not.toContain('<item>');
    expect(createLlmsTxt(config, pages)).not.toContain('https://example.test/docs)');
    expect(createPageMarkdownEntries(config, pages)).toEqual([{ path: 'docs/zh' }]);
    expect(resolvePageMarkdown(config, pages, undefined, '/docs').status).toBe('missing');
  });

  it('combines global and page robots meta without duplicate generic tags', () => {
    const global = resolveSvedocsConfig({ ...config, seo: { ...config.seo,
      head: { meta: [{ name: 'ROBOTS', content: 'none' }, { name: 'googlebot', content: 'max-snippet:50' }] } } });
    const page = { ...en, seo: { ...en.seo, robots: 'index,follow', head: { meta: [{ name: 'robots', content: 'noarchive' }] } } };
    const metadata = createPageMetadata(global, page, [page, zh]);
    expect(metadata.robots?.split(',').sort()).toEqual(['noarchive', 'nofollow', 'noindex']);
    expect(metadata.head.meta).toEqual([{ name: 'googlebot', content: 'max-snippet:50' }]);
    expect(createSitemapXml(global, [page, zh])).not.toContain('<url>');
    expect(createPageAlternates(global, zh, [page, zh])).toEqual([]);
    expect(createPageMarkdownEntries(global, [page, zh])).toEqual([]);
    const local = { ...en, seo: { ...en.seo, head: { meta: [{ name: 'robots', content: 'noindex' }] } } };
    expect(createSitemapXml(config, [local])).not.toContain('<url>');
  });

  it('deduplicates normalized canonical locations and preserves reciprocal translations', () => {
    const pages = [en, zh];
    expect(createPageAlternates(config, en, pages)).toEqual(createPageAlternates(config, zh, pages));
    const canonical = '/docs';
    expect(createSitemapXml(config, [{ ...en, seo: { title: 'A', canonical } },
      { ...zh, seo: { title: 'B', canonical: `https://example.test${canonical}` } }]).match(/<loc>/g)).toHaveLength(1);
  });
});

describe('metadata correctness', () => {
  it('keeps localized homepage titles clean and emits explicit author and locale semantics', () => {
    const home = createFixturePage({ kind: 'page', routePath: '/zh', scopePath: '/', locale: 'zh', seo: { title: 'Docs' } });
    expect(createPageMetadata(config, home).title).toBe('Docs');
    const author = { ...en, seo: { title: 'Guide', author: 'Team', authorType: 'Organization' as const } };
    expect(createPageMetadata(config, author).jsonLd.author).toEqual({ '@type': 'Organization', name: 'Team' });
    expect(createPageMetadata(config, en).openGraph.locale).toBe('en_GB');
    expect(createPageMetadata(config, zh).openGraph.locale).toBe('zh_CN');
    expect(createPageMetadata(resolveSvedocsConfig(), en).openGraph.locale).toBeUndefined();
  });

  it('uses real localized ancestors and normalized canonical URLs for breadcrumbs', () => {
    const page = createFixturePage({ kind: 'doc', locale: 'zh', routePath: '/docs/zh/missing/guide', scopePath: '/docs/missing/guide', title: '指南' });
    const staticConfig = resolveSvedocsConfig({ ...config, build: { mode: 'static' } });
    const metadata = createPageMetadata(staticConfig, page, [en, zh, page]);
    const breadcrumbs = metadata.head.jsonLd.find((entry) => entry['@type'] === 'BreadcrumbList');
    expect(breadcrumbs?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: staticConfig.i18n.messages.zh!['nav.docs'], item: 'https://example.test/docs/zh/' },
      { '@type': 'ListItem', position: 2, name: '指南', item: 'https://example.test/docs/zh/missing/guide/' }
    ]);
    const custom = { '@graph': [{ '@type': 'BreadcrumbList', itemListElement: [] }] };
    expect(createPageMetadata(config, { ...page, seo: { ...page.seo, head: { jsonLd: [custom] } } }, [zh, page]).head.jsonLd).toEqual([custom]);
  });

  it('describes generated images without inventing dimensions for custom images', () => {
    const generated = createPageMetadata(config, en);
    expect(generated.openGraph).toMatchObject({ imageWidth: 1200, imageHeight: 630, imageType: 'image/png', imageAlt: en.seo.title });
    expect(generated.twitter.imageAlt).toBe(en.seo.title);
    const custom = createPageMetadata(config, { ...en, seo: { title: 'A', image: '/cover.jpg', imageAlt: 'A diagram' } });
    expect(custom.openGraph.imageAlt).toBe('A diagram');
    expect(custom.openGraph.imageWidth).toBeUndefined();
    expect(custom.openGraph.imageType).toBeUndefined();
  });

  it('requires revalidation of stable OG URLs and renders fresh image input', async () => {
    const svgConfig = resolveSvedocsConfig({ seo: { ogImage: { format: 'svg' } } });
    const before = await createPageOgImageResponse(svgConfig, en);
    expect(before.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
    const after = await createPageOgImageResponse(svgConfig, { ...en, seo: { title: 'Changed', description: 'New description' } });
    expect(await after.text()).toContain('Changed');
    expect(await before.text()).not.toContain('Changed');
    const png = await createPageOgImageResponse(config, zh);
    const bytes = Buffer.from(await png.arrayBuffer());
    expect(png.headers.get('content-type')).toBe('image/png');
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  it('wraps long multilingual sharing titles and escapes markup', () => {
    const svg = createOgSvg({ title: 'svedocs — 基于 SvelteKit 的文档框架', description: '<script>alert(1)</script>' });
    expect(svg).toContain('文档框架');
    expect(svg.match(/font-size="60"/g)!.length).toBeGreaterThan(1);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(createOgSvg({ title: '文'.repeat(1000) })).toContain('…');
  });

  it('ignores checkout mtime while preserving explicit dates and independent SEO titles', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'svedocs-seo-dates-'));
    try {
      await mkdir(path.join(root, 'content/docs'), { recursive: true });
      const source = path.join(root, 'content/docs/index.md');
      const markdown = '---\ntitle: Visible\nseoTitle: Search title\ndescription: A page\n---\nBody';
      await writeFile(source, markdown);
      const load = () => loadSvedocsContent({ projectRoot: root, config: { site: { url: 'https://example.test' }, images: false } });
      const first = await load();
      await utimes(source, new Date('2020-01-01'), new Date('2020-01-01'));
      const second = await load();
      expect(first.pages[0]!.lastUpdated).not.toBe(second.pages[0]!.lastUpdated);
      expect(createSitemapXml(first.config, first.pages)).toBe(createSitemapXml(second.config, second.pages));
      expect(createSitemapXml(first.config, first.pages)).not.toContain('<lastmod>');
      expect(createPageMetadata(first.config, first.pages[0]!).jsonLd.dateModified).toBeUndefined();
      expect(first.pages[0]!.title).toBe('Visible');
      expect(first.pages[0]!.seo.title).toBe('Search title');
      await writeFile(source, markdown.replace('title: Visible', 'updatedTime: 2026-01-02\ntitle: Visible'));
      const explicit = await load();
      expect(createSitemapXml(explicit.config, explicit.pages)).toContain('<lastmod>2026-01-02T00:00:00.000Z</lastmod>');
      expect(createPageMetadata(explicit.config, explicit.pages[0]!).jsonLd.dateModified).toBe('2026-01-02T00:00:00.000Z');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
