import type { SvedocsPage, SvedocsResolvedConfig } from '../core.js';
import { formatRoutePathForBuildMode } from '../core/utils.js';
import { createDisabledDiscoveryResponse, createDiscoveryResponse, escapeXml } from './response.js';
import { isDiscoverablePage } from './sitemap.js';

interface RssEntry {
  page: SvedocsPage;
  date?: Date;
  link: string;
}

export function createRssXml(config: SvedocsResolvedConfig, pages: SvedocsPage[]): string {
  const rss = config.seo.rss;
  if (!rss) return '';
  const locale = rss.locale ?? config.i18n.defaultLocale;
  const entries = pages
    .filter(isDiscoverablePage)
    .filter((page) => isPageInLocale(config, page, locale))
    .map((page): RssEntry | undefined => {
      const link = createPageUrl(config, page);
      if (!link) return undefined;
      const date = parseDate(page.seo.updatedTime ?? page.seo.publishedTime ?? page.lastUpdated);
      return { page, link, ...(date ? { date } : {}) };
    })
    .filter((entry): entry is RssEntry => Boolean(entry))
    .sort((left, right) => (right.date?.getTime() ?? 0) - (left.date?.getTime() ?? 0))
    .slice(0, rss.limit);
  const channelUrl = config.site.url ?? '/';
  const feedUrl = createAbsoluteUrl(config, '/feed.xml') ?? '/feed.xml';
  const language = resolveFeedLanguage(config, locale);
  const lastBuildDate = entries.find((entry) => entry.date)?.date;
  const items = entries.map(({ page, date, link }) => [
    '    <item>',
    `      <title>${escapeXml(page.title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    ...(page.seo.description ?? page.description
      ? [`      <description>${escapeXml(page.seo.description ?? page.description ?? '')}</description>`]
      : []),
    ...(date ? [`      <pubDate>${date.toUTCString()}</pubDate>`] : []),
    ...(page.seo.keywords ?? []).map((keyword) => `      <category>${escapeXml(keyword)}</category>`),
    '    </item>'
  ].join('\n')).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(rss.title)}</title>`,
    `    <link>${escapeXml(channelUrl)}</link>`,
    `    <description>${escapeXml(rss.description)}</description>`,
    `    <language>${escapeXml(language)}</language>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...(lastBuildDate ? [`    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`] : []),
    items,
    '  </channel>',
    '</rss>',
    ''
  ].join('\n');
}

export function createRssResponse(
  config: SvedocsResolvedConfig,
  pages: SvedocsPage[],
  request?: Request
): Response {
  if (!config.seo.rss) return createDisabledDiscoveryResponse('RSS');
  return createDiscoveryResponse(createRssXml(config, pages), 'application/rss+xml; charset=utf-8', request);
}

function createPageUrl(config: SvedocsResolvedConfig, page: SvedocsPage): string | undefined {
  const routePath = formatRoutePathForBuildMode(page.routePath, config.build.mode);
  const link = page.seo.canonical
    ? createAbsoluteUrl(config, page.seo.canonical) ?? page.seo.canonical
    : createAbsoluteUrl(config, routePath) ?? routePath;
  if (!config.site.url || !/^https?:\/\//.test(link)) return link;
  try {
    return new URL(link).origin === new URL(config.site.url).origin ? link : undefined;
  } catch {
    return undefined;
  }
}

function isPageInLocale(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  locale: string | undefined
): boolean {
  if (!locale) return true;
  const pageLocale = page.locale ?? config.i18n.defaultLocale;
  return pageLocale ? pageLocale === locale : config.i18n.locales.length === 0;
}

function createAbsoluteUrl(config: SvedocsResolvedConfig, value: string): string | undefined {
  if (/^https?:\/\//.test(value)) return value;
  if (!config.site.url) return undefined;
  return new URL(value, config.site.url).href;
}

function resolveFeedLanguage(config: SvedocsResolvedConfig, locale: string | undefined): string {
  if (!locale) return 'en';
  return config.i18n.locales.find((candidate) => candidate.code === locale)?.hreflang ?? locale;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
