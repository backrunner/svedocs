import type { SvedocsPage, SvedocsResolvedConfig } from '../core.js';
import { formatRoutePathForBuildMode } from '../core/utils.js';
import { createPageAlternates } from './metadata.js';
import { createDisabledDiscoveryResponse, createDiscoveryResponse, escapeXml } from './response.js';
import type { SvedocsPageAlternate } from './types.js';

export function createSitemapXml(config: SvedocsResolvedConfig, pages: SvedocsPage[]): string {
  if (!config.seo.sitemap) return '';
  const discoverablePages = pages.filter(isDiscoverablePage);
  const alternateIndex = createAlternateIndex(config, discoverablePages);
  const urls = discoverablePages
    .map((page) => {
      const loc = createSitemapLocation(config, page);
      if (!loc) return '';
      const lastmod = page.seo.updatedTime ?? page.lastUpdated;
      const alternates = alternateIndex.get(createAlternateKey(page)) ?? [];
      return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
        ...alternates.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.lang)}" href="${escapeXml(alternate.href)}" />`),
        '  </url>'
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export function createRobotsTxt(config: SvedocsResolvedConfig): string {
  if (!config.seo.robots) return '';
  const sitemap = config.seo.sitemap ? createAbsoluteUrl(config, '/sitemap.xml') : undefined;
  return [
    'User-agent: *',
    'Allow: /',
    ...(sitemap ? [`Sitemap: ${sitemap}`] : [])
  ].join('\n') + '\n';
}

export function createSitemapResponse(
  config: SvedocsResolvedConfig,
  pages: SvedocsPage[],
  request?: Request
): Response {
  if (!config.seo.sitemap) return createDisabledDiscoveryResponse('Sitemap');
  return createDiscoveryResponse(createSitemapXml(config, pages), 'application/xml; charset=utf-8', request);
}

export function createRobotsResponse(config: SvedocsResolvedConfig, request?: Request): Response {
  if (!config.seo.robots) return createDisabledDiscoveryResponse('Robots');
  return createDiscoveryResponse(createRobotsTxt(config), 'text/plain; charset=utf-8', request);
}

export function isDiscoverablePage(page: SvedocsPage): boolean {
  return !page.hidden && !/(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(page.seo.robots ?? '');
}

function createAlternateIndex(
  config: SvedocsResolvedConfig,
  pages: SvedocsPage[]
): Map<string, SvedocsPageAlternate[]> {
  const groups = new Map<string, SvedocsPage[]>();
  for (const page of pages) {
    const key = createAlternateKey(page);
    const group = groups.get(key) ?? [];
    group.push(page);
    groups.set(key, group);
  }
  const alternates = new Map<string, SvedocsPageAlternate[]>();
  for (const [key, group] of groups) {
    const reference = group[0];
    if (reference) alternates.set(key, createPageAlternates(config, reference, group));
  }
  return alternates;
}

function createAlternateKey(page: SvedocsPage): string {
  return `${page.kind}:${page.scopePath}`;
}

function createSitemapLocation(config: SvedocsResolvedConfig, page: SvedocsPage): string | undefined {
  const routePath = formatRoutePathForBuildMode(page.routePath, config.build.mode);
  const location = page.seo.canonical
    ? createAbsoluteUrl(config, page.seo.canonical) ?? page.seo.canonical
    : createAbsoluteUrl(config, routePath) ?? routePath;
  if (!config.site.url || !/^https?:\/\//.test(location)) return undefined;
  try {
    return new URL(location).origin === new URL(config.site.url).origin ? location : undefined;
  } catch {
    return undefined;
  }
}

function createAbsoluteUrl(config: SvedocsResolvedConfig, value: string): string | undefined {
  if (/^https?:\/\//.test(value)) return value;
  if (!config.site.url) return undefined;
  return new URL(value, config.site.url).href;
}
