import type { SvedocsPage, SvedocsResolvedConfig, SvedocsResolvedSeoHead, SvedocsSeoHead } from '../core.js';
import { formatRoutePathForBuildMode } from '../core/utils.js';
import { createConfiguredOgImageFormat, createPageOgImagePath } from './image.js';
import type { SvedocsPageAlternate, SvedocsPageMetadata } from './types.js';

export function createPageMetadata(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  pages: SvedocsPage[] = []
): SvedocsPageMetadata {
  const title = page.routePath === '/' ? page.seo.title : `${page.seo.title} | ${config.site.name}`;
  const description = page.seo.description ?? config.site.description;
  const canonical = page.seo.canonical
    ? createAbsoluteUrl(config, page.seo.canonical) ?? page.seo.canonical
    : createAbsoluteRouteUrl(config, page.routePath);
  const keywords = page.seo.keywords ?? [];
  const robots = page.seo.robots;
  const head = withRssAlternate(config, mergeSeoHead(config.seo.head, page.seo.head));
  const generatedImage = config.seo.ogImage === false
    ? undefined
    : createAbsoluteUrl(config, createPageOgImagePath(page, createConfiguredOgImageFormat(config)));
  const image = page.seo.image ? createAbsoluteUrl(config, page.seo.image) : generatedImage;
  const type = page.seo.type ?? (page.kind === 'doc' ? 'article' : 'website');
  const author = page.seo.author ?? config.seo.defaultAuthor;
  const updatedTime = page.seo.updatedTime ?? page.lastUpdated;
  const pageLanguage = getPageLanguage(config, page);
  const ogLocale = toOpenGraphLocale(pageLanguage);
  const alternateOgLocales = createPageAlternates(config, page, pages)
    .filter((alternate) => alternate.lang !== 'x-default' && alternate.locale !== page.locale)
    .map((alternate) => toOpenGraphLocale(alternate.lang));
  return {
    title,
    description,
    keywords,
    head,
    ...(canonical ? { canonical } : {}),
    ...(image ? { image } : {}),
    ...(robots ? { robots } : {}),
    openGraph: {
      title,
      description,
      type,
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { image } : {}),
      siteName: config.site.name,
      locale: ogLocale,
      ...(alternateOgLocales.length > 0 ? { alternateLocales: [...new Set(alternateOgLocales)] } : {}),
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

export function createPageAlternates(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  pages: SvedocsPage[]
): SvedocsPageAlternate[] {
  if (config.i18n.locales.length === 0) return [];
  const candidates = pages
    .filter((candidate) => !candidate.hidden)
    .filter((candidate) => candidate.kind === page.kind)
    .filter((candidate) => candidate.scopePath === page.scopePath);
  const alternates: SvedocsPageAlternate[] = [];
  for (const candidate of candidates) {
    if (!candidate.locale) continue;
    const href = candidate.seo.canonical
      ? createAbsoluteUrl(config, candidate.seo.canonical) ?? candidate.seo.canonical
      : createAbsoluteRouteUrl(config, candidate.routePath);
    if (!href) continue;
    const locale = config.i18n.locales.find((item) => item.code === candidate.locale);
    alternates.push({
      lang: locale?.hreflang ?? candidate.locale,
      href,
      locale: candidate.locale
    });
  }
  const defaultLocale = config.i18n.defaultLocale;
  const defaultPage = defaultLocale
    ? candidates.find((candidate) => candidate.locale === defaultLocale)
    : undefined;
  const defaultHref = defaultPage?.seo.canonical
    ? createAbsoluteUrl(config, defaultPage.seo.canonical) ?? defaultPage.seo.canonical
    : defaultPage
      ? createAbsoluteRouteUrl(config, defaultPage.routePath)
      : undefined;
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

function mergeSeoHead(globalHead: SvedocsResolvedSeoHead, pageHead: SvedocsSeoHead | undefined): SvedocsResolvedSeoHead {
  return {
    meta: [...globalHead.meta, ...(pageHead?.meta ?? [])],
    links: [...globalHead.links, ...(pageHead?.links ?? [])],
    jsonLd: [...globalHead.jsonLd, ...(pageHead?.jsonLd ?? pageHead?.jsonld ?? pageHead?.['json-ld'] ?? [])]
  };
}

function withRssAlternate(config: SvedocsResolvedConfig, head: SvedocsResolvedSeoHead): SvedocsResolvedSeoHead {
  if (!config.seo.rss || head.links.some((link) => link.type === 'application/rss+xml')) return head;
  return {
    ...head,
    links: [
      ...head.links,
      {
        rel: 'alternate',
        type: 'application/rss+xml',
        href: createAbsoluteUrl(config, '/feed.xml') ?? '/feed.xml',
        title: config.seo.rss.title
      }
    ]
  };
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
    inLanguage: getPageLanguage(config, page),
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

function getPageLanguage(config: SvedocsResolvedConfig, page: SvedocsPage): string {
  const code = page.locale ?? config.i18n.defaultLocale ?? 'en';
  const locale = config.i18n.locales.find((candidate) => candidate.code === code);
  return locale?.hreflang ?? code;
}

function toOpenGraphLocale(language: string): string {
  return language.replaceAll('-', '_');
}

function createAbsoluteUrl(config: SvedocsResolvedConfig, value: string): string | undefined {
  if (/^https?:\/\//.test(value)) return value;
  if (!config.site.url) return undefined;
  return new URL(value, config.site.url).href;
}

function createAbsoluteRouteUrl(config: SvedocsResolvedConfig, routePath: string): string | undefined {
  return createAbsoluteUrl(config, formatRoutePathForBuildMode(routePath, config.build.mode));
}

export function serializeJsonLd(value: unknown): string {
  return (JSON.stringify(value) ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function createJsonLdScript(value: unknown): string {
  return `<script type="application/ld+json">${serializeJsonLd(value)}<${'/script'}>`;
}
