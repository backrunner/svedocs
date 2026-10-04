import { describe, expect, it } from 'vitest';
import { resolveSvedocsConfig, createCanonicalUrl, resolveSvedocsHref, resolveSvedocsPageRoute } from '../src/core.js';
import { createFixturePage } from '../src/testing.js';
import { createPageMetadata, createPageAlternates, createSitemapXml, createRssXml } from '../src/og.js';
import { createIndexNowPayloads } from '../src/integrations/indexnow.js';
import { formatRoutePathForBuildMode } from '../src/core/utils.js';
import { svedocsTrailingSlash } from '../src/cloudflare.js';

const en = createFixturePage({ kind: 'doc', locale: 'en', routePath: '/docs/guide', scopePath: '/docs/guide' });
const zh = createFixturePage({ ...en, id: 'zh', locale: 'zh', routePath: '/docs/zh/guide' });
const config = resolveSvedocsConfig({ site: { name: 'Docs', url: 'https://example.test/' }, seo: { defaultAuthor: 'Team', defaultAuthorType: 'Organization', rss: true },
  i18n: { defaultLocale: 'en', locales: ['en', 'zh'] }, integrations: { indexNow: { key: 'abcdefgh' } } });

describe('shared JSON-LD entities', () => {
  it('gives WebPage and TechArticle stable references to one website and publisher', () => {
    for (const page of [en, createFixturePage({ kind: 'page', routePath: '/' })]) {
      const metadata = createPageMetadata(config, page);
      expect(metadata.jsonLd.isPartOf).toEqual({ '@id': 'https://example.test/#website' });
      expect(metadata.jsonLd.publisher).toEqual({ '@id': 'https://example.test/#organization' });
      expect(metadata.jsonLd.author).toEqual({ '@id': 'https://example.test/#organization' });
      expect(metadata.jsonLd['@id']).toBe(`${metadata.canonical}#${page.kind === 'doc' ? 'article' : 'webpage'}`);
      expect(metadata.head.jsonLd.map((node) => node['@type'])).toEqual(['WebSite', 'Organization']);
    }
  });

  it('merges repeated IDs in anonymous custom graphs with page overrides and retains distinct entities', () => {
    const website = { '@id': 'https://example.test/#website', '@type': 'WebSite', name: 'Custom website', url: 'https://example.test' };
    const org = { '@id': 'https://example.test/#organization', '@type': 'Organization', name: 'Publisher', logo: '/logo.svg' };
    const global = resolveSvedocsConfig({ ...config, seo: { ...config.seo, head: { jsonLd: [website, org] } } });
    const page = { ...en, seo: { ...en.seo, head: { jsonLd: [{ '@context': 'https://schema.org', '@graph': [
      { ...website, description: 'Page override' }, { '@id': org['@id'], logo: '/new-logo.svg' },
      { '@type': 'TechArticle', '@id': 'https://example.test/docs/guide#article', headline: 'Custom title' },
      { '@type': 'Organization', '@id': 'https://elsewhere.test/#organization', name: 'Other team' }
    ] }] } } };
    const metadata = createPageMetadata(global, page);
    const nodes = [metadata.jsonLd, ...metadata.head.jsonLd];
    expect(new Set(nodes.map((node) => node['@id'])).size).toBe(nodes.length);
    expect(metadata.jsonLd.headline).toBe('Custom title');
    expect(nodes.find((node) => node['@id'] === website['@id'])).toMatchObject({ name: 'Custom website', description: 'Page override' });
    expect(nodes.find((node) => node['@id'] === org['@id'])).toMatchObject({ name: 'Publisher', logo: '/new-logo.svg' });
    expect(nodes.filter((node) => node['@type'] === 'Organization')).toHaveLength(2);
    expect(global.seo.head.jsonLd).toEqual([website, org]);
  });

  it('reuses explicit custom entity IDs and identifies the current page by canonical URL', () => {
    const custom = resolveSvedocsConfig({ ...config, seo: { ...config.seo, head: { jsonLd: [
      { '@type': 'WebSite', '@id': 'https://example.test/#site', url: 'https://example.test' },
      { '@type': 'Organization', '@id': 'https://example.test/#publisher', url: 'https://example.test/' }
    ] } } });
    const page = { ...en, seo: { ...en.seo, head: { jsonLd: [{ '@type': 'TechArticle', '@id': 'https://example.test/#guide', url: '/docs/guide/', headline: 'Override' }] } } };
    const metadata = createPageMetadata(custom, page);
    expect(metadata.jsonLd).toMatchObject({ '@id': 'https://example.test/#guide', headline: 'Override', isPartOf: { '@id': 'https://example.test/#site' }, publisher: { '@id': 'https://example.test/#publisher' } });
    expect(metadata.head.jsonLd.filter((node) => node['@type'] === 'TechArticle')).toHaveLength(0);
    expect(metadata.jsonLd.url).toBe('https://example.test/docs/guide');
  });

  it('merges repeated anonymous site entities by URL and retains named graph contexts', () => {
    const website = { '@type': 'WebSite', url: 'https://example.test/' };
    const named = { '@context': { '@vocab': 'https://schema.org/' }, '@id': 'https://example.test/#graph', '@graph': [{ '@type': 'FAQPage', name: 'FAQ' }] };
    const cfg = resolveSvedocsConfig({ ...config, seo: { ...config.seo, head: { jsonLd: [website, named] } } });
    const page = { ...en, seo: { ...en.seo, head: { jsonLd: [{ ...website, description: 'Updated' }] } } };
    const metadata = createPageMetadata(cfg, page);
    expect(metadata.head.jsonLd.filter((node) => node['@type'] === 'WebSite')).toHaveLength(1);
    expect(metadata.head.jsonLd).toContainEqual(named);
  });

  it('deduplicates identical anonymous nodes without collapsing different entities of the same type', () => {
    const page = { ...en, seo: { ...en.seo, head: { jsonLd: [
      { '@type': 'FAQPage', name: 'FAQ' }, { name: 'FAQ', '@type': 'FAQPage' }, { '@type': 'FAQPage', name: 'Other FAQ' }
    ] } } };
    expect(createPageMetadata(config, page).head.jsonLd.filter((node) => node['@type'] === 'FAQPage')).toHaveLength(2);
    expect(createPageMetadata(resolveSvedocsConfig(), en).jsonLd.isPartOf).toMatchObject({ '@type': 'WebSite' });
  });
});

describe.each(['edge', 'static', 'spa'] as const)('URL consistency in %s', (mode) => {
  const resolved = resolveSvedocsConfig({ ...config, build: { mode } });
  const path = mode === 'edge' ? '/docs/guide' : '/docs/guide/';
  const absolute = `https://example.test${path}`;

  it('normalizes routes, same-origin canonicals and all discovery URLs together', () => {
    for (const canonical of ['/docs/./guide/', 'https://example.test/docs/guide/', '/docs/missing/../guide#section']) {
      const page = { ...en, seo: { ...en.seo, canonical } };
      const metadata = createPageMetadata(resolved, page, [page, zh]);
      expect(metadata.canonical).toBe(absolute);
      expect(metadata.openGraph.url).toBe(absolute);
      expect(metadata.jsonLd.url).toBe(absolute);
      expect(createPageAlternates(resolved, page, [page, zh])[0]?.href).toBe(absolute);
      expect(createSitemapXml(resolved, [page, { ...page, id: 'duplicate', seo: { ...page.seo, canonical: absolute } }]).match(/<loc>/g)).toHaveLength(1);
      expect(createRssXml(resolved, [page])).toContain(`<link>${absolute}</link>`);
      expect(createIndexNowPayloads(resolved, [page])[0]?.urlList).toEqual([absolute]);
    }
    expect(svedocsTrailingSlash(mode)).toBe(mode === 'edge' ? 'never' : 'always');
    expect(resolveSvedocsHref({ config: resolved, pages: [en], href: '/docs/guide/?q=1#anchor' }).href).toBe(`${path}?q=1#anchor`);
    const fallback = resolveSvedocsPageRoute('/docs/zh/guide/', [en], resolved);
    expect(fallback).toMatchObject({ status: 'redirect', location: path });
    expect(formatRoutePathForBuildMode('//docs//guide/../guide/?q=1#anchor', mode)).toBe(`${path}?q=1#anchor`);
  });

  it('preserves external paths, endpoint URLs and meaningful queries', () => {
    expect(createCanonicalUrl(resolved, 'https://external.test/path/?a=1#fragment')).toBe('https://external.test/path/?a=1');
    expect(createCanonicalUrl(resolved, '/docs/guide?a=1#fragment')).toBe(`${absolute}?a=1`);
    expect(createCanonicalUrl(resolved, 'javascript:alert(1)')).toBeUndefined();
    const page = { ...en, seo: { ...en.seo, image: '/cover.png' } };
    expect(createPageMetadata(resolved, page).image).toBe('https://example.test/cover.png');
    expect(createPageMetadata(resolved, page).head.links.find((link) => link.type === 'application/rss+xml')?.href).toBe('https://example.test/feed.xml');
  });
});
