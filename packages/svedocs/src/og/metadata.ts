import type { SvedocsPage, SvedocsResolvedConfig } from '../core.js';
import { createConfiguredOgImageFormat, createPageOgImagePath } from './image.js';
import type { SvedocsPageAlternate, SvedocsPageMetadata } from './types.js';

export function createPageMetadata(config: SvedocsResolvedConfig, page: SvedocsPage): SvedocsPageMetadata {
  const title = page.routePath === '/' ? page.seo.title : `${page.seo.title} | ${config.site.name}`;
  const description = page.seo.description ?? config.site.description;
  const canonical = page.seo.canonical ?? createAbsoluteUrl(config, page.routePath);
  const generatedImage = config.seo.ogImage === false
    ? undefined
    : createAbsoluteUrl(config, createPageOgImagePath(page, createConfiguredOgImageFormat(config)));
  const image = page.seo.image ? createAbsoluteUrl(config, page.seo.image) : generatedImage;
  const type = page.seo.type ?? (page.kind === 'doc' ? 'article' : 'website');
  const author = page.seo.author ?? config.seo.defaultAuthor;
  const updatedTime = page.seo.updatedTime ?? page.lastUpdated;
  return {
    title,
    description,
    ...(canonical ? { canonical } : {}),
    ...(image ? { image } : {}),
    openGraph: {
      title,
      description,
      type,
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { image } : {}),
      siteName: config.site.name,
      ...(author ? { author } : {}),
      ...(page.seo.publishedTime ? { publishedTime: page.seo.publishedTime } : {}),
      ...(updatedTime ? { updatedTime } : {})
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { image } : {})
    },
    jsonLd: createPageJsonLd(config, page, {
      title,
      description,
      ...(canonical ? { canonical } : {}),
      ...(image ? { image } : {})
    })
  };
}

export function createSitemapXml(config: SvedocsResolvedConfig, pages: SvedocsPage[]): string {
  const urls = pages
    .filter((page) => !page.hidden)
    .map((page) => {
      const loc = page.seo.canonical ?? createAbsoluteUrl(config, page.routePath) ?? page.routePath;
      const lastmod = page.seo.updatedTime ?? page.lastUpdated;
      return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
        '  </url>'
      ].join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function createPageAlternates(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  pages: SvedocsPage[]
): SvedocsPageAlternate[] {
  if (config.i18n.locales.length === 0) return [];
  const candidates = pages
    .filter((candidate) => !candidate.hidden)
    .filter((candidate) => candidate.scopePath === page.scopePath)
    .filter((candidate) => candidate.version === page.version);
  const alternates: SvedocsPageAlternate[] = [];
  for (const candidate of candidates) {
    if (!candidate.locale) continue;
    const href = candidate.seo.canonical ?? createAbsoluteUrl(config, candidate.routePath);
    if (!href) continue;
    alternates.push({
      lang: candidate.locale,
      href,
      locale: candidate.locale,
      ...(candidate.version ? { version: candidate.version } : {})
    });
  }
  const defaultLocale = config.i18n.defaultLocale;
  const defaultPage = defaultLocale
    ? candidates.find((candidate) => candidate.locale === defaultLocale)
    : undefined;
  const defaultHref = defaultPage?.seo.canonical ?? (defaultPage ? createAbsoluteUrl(config, defaultPage.routePath) : undefined);
  const defaultAlternate: SvedocsPageAlternate[] = defaultHref
    ? [
        {
          lang: 'x-default',
          href: defaultHref,
          ...(defaultLocale ? { locale: defaultLocale } : {})
        }
      ]
    : [];
  return uniqueAlternates([...alternates, ...defaultAlternate]);
}

export function createRobotsTxt(config: SvedocsResolvedConfig): string {
  const sitemap = createAbsoluteUrl(config, '/sitemap.xml');
  return [
    'User-agent: *',
    'Allow: /',
    ...(sitemap ? [`Sitemap: ${sitemap}`] : [])
  ].join('\n') + '\n';
}

function uniqueAlternates(alternates: SvedocsPageAlternate[]): SvedocsPageAlternate[] {
  const seen = new Set<string>();
  return alternates.filter((alternate) => {
    const key = `${alternate.lang}:${alternate.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createPageJsonLd(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  metadata: Pick<SvedocsPageMetadata, 'title' | 'description' | 'canonical' | 'image'>
): Record<string, unknown> {
  const graph: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': page.kind === 'doc' ? 'TechArticle' : 'WebPage',
    headline: metadata.title,
    description: metadata.description,
    isPartOf: {
      '@type': 'WebSite',
      name: config.site.name,
      ...(config.site.url ? { url: config.site.url } : {})
    }
  };
  if (metadata.canonical) graph.url = metadata.canonical;
  if (metadata.image) graph.image = metadata.image;
  const author = page.seo.author ?? config.seo.defaultAuthor;
  const updatedTime = page.seo.updatedTime ?? page.lastUpdated;
  if (author) {
    graph.author = {
      '@type': 'Person',
      name: author
    };
  }
  if (page.seo.publishedTime) graph.datePublished = page.seo.publishedTime;
  if (updatedTime) graph.dateModified = updatedTime;
  if (page.kind === 'doc') {
    graph.position = page.order;
    graph.about = page.headings.map((heading) => heading.text);
  }
  return graph;
}

function createAbsoluteUrl(config: SvedocsResolvedConfig, value: string): string | undefined {
  if (/^https?:\/\//.test(value)) return value;
  if (!config.site.url) return undefined;
  return new URL(value, config.site.url).href;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
