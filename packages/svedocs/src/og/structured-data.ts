import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { pageBreadcrumbs } from '../core/breadcrumbs.js';
import { isDiscoverablePage } from '../core/seo.js';
import { formatRoutePathForBuildMode } from '../core/utils.js';

export function breadcrumbJsonLd(config: SvedocsResolvedConfig, page: SvedocsPage, pages: SvedocsPage[]): Record<string, unknown> | undefined {
  if (!config.site.url || !isDiscoverablePage(page, config)) return undefined;
  const locale = page.locale ?? config.i18n.defaultLocale ?? 'en';
  const label = config.i18n.messages[locale]?.['nav.docs'] ?? 'Docs';
  const ancestors = pageBreadcrumbs(page, pages.filter((candidate) => isDiscoverablePage(candidate, config)), label);
  if (!ancestors.length) return undefined;
  const items = [...ancestors, { path: page.routePath, label: page.title }];
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const target = item.path === page.routePath ? page : pages.find((candidate) => candidate.routePath === item.path);
      return { '@type': 'ListItem', position: index + 1, name: item.label,
        item: new URL(target?.seo.canonical ?? formatRoutePathForBuildMode(item.path, config.build.mode), config.site.url).href };
    })
  };
}

export function hasBreadcrumbJsonLd(entries: unknown[]): boolean {
  return entries.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const value = entry as Record<string, unknown>;
    return [value['@type']].flat().includes('BreadcrumbList')
      || (Array.isArray(value['@graph']) && hasBreadcrumbJsonLd(value['@graph']));
  });
}
