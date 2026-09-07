import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSeoMetaTag } from './types.js';

export function isRobotsMeta(tag: SvedocsSeoMetaTag): boolean {
  return tag.name?.trim().toLowerCase() === 'robots';
}

/** Robots directives combine conservatively; a page cannot override a global noindex. */
export function effectiveRobots(page: SvedocsPage, config?: SvedocsResolvedConfig): string | undefined {
  const values = [page.seo.robots, ...(config?.seo.head.meta ?? []).filter(isRobotsMeta).map((tag) => tag.content),
    ...(page.seo.head?.meta ?? []).filter(isRobotsMeta).map((tag) => tag.content)];
  const directives = new Set(values.filter(Boolean).flatMap((value) => value!.toLowerCase().split(/,|\s+(?=(?:noindex|index|nofollow|follow|none|all)(?:[\s,]|$))/).map((part) => part.trim())).filter(Boolean));
  if (directives.delete('none')) { directives.add('noindex'); directives.add('nofollow'); }
  if (directives.has('noindex')) { directives.delete('index'); directives.delete('all'); }
  if (directives.has('nofollow')) { directives.delete('follow'); directives.delete('all'); }
  return directives.size ? [...directives].join(',') : undefined;
}

export function isDiscoverablePage(page: SvedocsPage, config?: SvedocsResolvedConfig): boolean {
  return !page.hidden && !/(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(effectiveRobots(page, config) ?? '');
}

/** Filesystem timestamps describe the checkout, not an editorial content change. */
export function seoUpdatedTime(page: SvedocsPage): string | undefined {
  const value = page.seo.updatedTime;
  return value && Number.isFinite(Date.parse(value)) ? value : undefined;
}
