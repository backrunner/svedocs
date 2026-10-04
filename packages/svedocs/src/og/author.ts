import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { createAbsoluteUrl } from '../core/urls.js';

/** A page-specific author must not inherit another author's profile URL. */
export function resolveAuthorUrl(config: SvedocsResolvedConfig, page: SvedocsPage): string | undefined {
  const value = page.seo.authorUrl ?? (!page.seo.author || page.seo.author === config.seo.defaultAuthor
    ? config.seo.defaultAuthorUrl : undefined);
  return value ? createAbsoluteUrl(config, value) : undefined;
}
