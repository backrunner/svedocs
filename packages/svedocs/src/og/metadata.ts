import type { SvedocsPage, SvedocsResolvedConfig, SvedocsResolvedSeoHead, SvedocsSeoHead } from '../core.js';
import { createAbsoluteUrl, createPageCanonicalUrl } from '../core/urls.js';
import { createConfiguredOgImageFormat, createPageOgImagePath } from './image.js';
import { effectiveRobots, isRobotsMeta, isDiscoverablePage, seoUpdatedTime } from '../core/seo.js';
import { createStructuredData } from './jsonld.js';
import { resolveAuthorUrl } from './author.js';
import { breadcrumbJsonLd, hasBreadcrumbJsonLd } from './structured-data.js';
import type { SvedocsPageAlternate, SvedocsPageMetadata } from './types.js';

export function createPageMetadata(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  pages: SvedocsPage[] = []
): SvedocsPageMetadata {
  const title = (page.routePath === '/' || (page.kind === 'page' && page.scopePath === '/') || page.seo.title === config.site.name) ? page.seo.title : `${page.seo.title} | ${config.site.name}`;
  const description = page.seo.description ?? config.site.description;
  const canonical = createPageCanonicalUrl(config, page);
  const keywords = page.seo.keywords ?? [];
  const robots = effectiveRobots(page, config);
  const head = withRssAlternate(config, mergeSeoHead(config.seo.head, page.seo.head));
  head.meta = head.meta.filter((tag) => !isRobotsMeta(tag));
  const breadcrumb = breadcrumbJsonLd(config, page, pages);
  if (breadcrumb && !hasBreadcrumbJsonLd(head.jsonLd)) head.jsonLd = [...head.jsonLd, breadcrumb];
  const generatedImage = config.seo.ogImage === false
    ? undefined
    : createAbsoluteUrl(config, createPageOgImagePath(page, createConfiguredOgImageFormat(config)));
  const image = page.seo.image ? createAbsoluteUrl(config, page.seo.image) : generatedImage;
  const type = page.seo.type ?? (page.kind === 'doc' ? 'article' : 'website');
  const author = resolveAuthorUrl(config, page);
  const updatedTime = seoUpdatedTime(page);
  const pageLanguage = getPageLanguage(config, page);
  const ogLocale = pageOpenGraphLocale(config, page.locale, pageLanguage);
  const imageAlt = page.seo.imageAlt ?? page.seo.title;
  const imageDetails = page.seo.image ? {
    ...(page.seo.imageWidth && page.seo.imageWidth > 0 ? { imageWidth: page.seo.imageWidth } : {}),
    ...(page.seo.imageHeight && page.seo.imageHeight > 0 ? { imageHeight: page.seo.imageHeight } : {}),
    ...(page.seo.imageType ? { imageType: page.seo.imageType } : {})
  } : { imageWidth: 1200, imageHeight: 630, imageType: createConfiguredOgImageFormat(config) === 'png' ? 'image/png' : 'image/svg+xml' };
  const alternateOgLocales = createPageAlternates(config, page, pages)
    .filter((alternate) => alternate.lang !== 'x-default' && alternate.locale !== page.locale)
    .map((alternate) => pageOpenGraphLocale(config, alternate.locale, alternate.lang))
    .filter((locale): locale is string => Boolean(locale));
  const structured = createStructuredData(config, page, { title, description, ...(canonical ? { canonical } : {}), ...(image ? { image } : {}) }, head.jsonLd, pageLanguage);
  head.jsonLd = structured.entities;
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
      ...(image ? { image, imageAlt, ...imageDetails } : {}),
      siteName: config.site.name,
      ...(ogLocale ? { locale: ogLocale } : {}),
      ...(alternateOgLocales.length > 0 ? { alternateLocales: [...new Set(alternateOgLocales)] } : {}),
      ...(author ? { author } : {}),
      ...(page.seo.publishedTime ? { publishedTime: page.seo.publishedTime } : {}),
      ...(updatedTime ? { updatedTime } : {})
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { image, imageAlt } : {})
    },
    jsonLd: structured.page
  };
}

export function createPageAlternates(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  pages: SvedocsPage[]
): SvedocsPageAlternate[] {
  if (config.i18n.locales.length === 0 || !isDiscoverablePage(page, config)) return [];
  const candidates = pages
    .filter((candidate) => isDiscoverablePage(candidate, config))
    .filter((candidate) => candidate.kind === page.kind)
    .filter((candidate) => candidate.scopePath === page.scopePath);
  const alternates: SvedocsPageAlternate[] = [];
  for (const candidate of candidates) {
    if (!candidate.locale) continue;
    const href = createPageCanonicalUrl(config, candidate);
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
  const defaultHref = defaultPage ? createPageCanonicalUrl(config, defaultPage) : undefined;
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

function getPageLanguage(config: SvedocsResolvedConfig, page: SvedocsPage): string {
  const code = page.locale ?? config.i18n.defaultLocale ?? 'en';
  const locale = config.i18n.locales.find((candidate) => candidate.code === code);
  return locale?.hreflang ?? code;
}

function pageOpenGraphLocale(config: SvedocsResolvedConfig, code: string | undefined, language: string): string | undefined {
  const configured = config.i18n.locales.find((locale) => locale.code === (code ?? config.i18n.defaultLocale))?.ogLocale;
  if (configured) return configured;
  // Do not guess a territory for a language-only hreflang.
  const match = /^([a-z]{2,3})(?:-[a-z]{4})?-([a-z]{2})$/i.exec(language);
  return match ? `${match[1]!.toLowerCase()}_${match[2]!.toUpperCase()}` : undefined;
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
