import type { SvedocsPage, SvedocsResolvedConfig } from './types.js';
import { formatRoutePathForBuildMode } from './utils.js';

/** Asset and endpoint URLs never inherit page trailing-slash rules. */
export function createAbsoluteUrl(config: SvedocsResolvedConfig, value: string): string | undefined {
  try {
    const url = new URL(value, config.site.url);
    return /^https?:$/.test(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

/** Normalize local canonicals; external canonical paths belong to their owner. */
export function createCanonicalUrl(config: SvedocsResolvedConfig, value: string): string | undefined {
  const absolute = createAbsoluteUrl(config, value);
  if (!absolute) {
    return /^[a-z][a-z0-9+.-]*:|^\/\//i.test(value) ? undefined
      : formatRoutePathForBuildMode(value, config.build.mode).split('#')[0];
  }
  const url = new URL(absolute);
  const site = config.site.url ? new URL(config.site.url) : undefined;
  if (site && url.origin === site.origin) {
    url.pathname = formatRoutePathForBuildMode(url.pathname, config.build.mode);
  }
  url.hash = '';
  return url.href;
}

export function createPageCanonicalUrl(config: SvedocsResolvedConfig, page: Pick<SvedocsPage, 'seo' | 'routePath'>): string | undefined {
  if (!config.site.url && !page.seo.canonical) return undefined;
  return createCanonicalUrl(config, page.seo.canonical ?? page.routePath);
}
