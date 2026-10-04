import type { Handle } from '@sveltejs/kit';
import type { SvedocsResolvedConfig } from '../core/types.js';
import { resolveSvedocsPageRoute, type SvedocsRouteTarget } from '../core/routes.js';
import { normalizeRoutePath } from '../core/utils.js';

export interface SvedocsHtmlHandleOptions {
  config: SvedocsResolvedConfig;
  pages: readonly SvedocsRouteTarget[];
}

/** Also resolves the language of localized 404s without confusing locale-like slugs. */
export function getSvedocsDocumentAttributes(options: SvedocsHtmlHandleOptions, pathname: string): { lang: string; dir: 'ltr' | 'rtl' } {
  let path = pathname;
  try { path = decodeURI(pathname); } catch { /* Keep malformed escapes for normal route handling. */ }
  const resolution = resolveSvedocsPageRoute(path, options.pages, options.config);
  const segments = normalizeRoutePath(path).split('/').filter(Boolean);
  const prefix = segments[segments[0] === 'docs' ? 1 : 0];
  const code = resolution.status === 'found' ? resolution.page.locale ?? options.config.i18n.defaultLocale
    : options.config.i18n.locales.find((locale) => locale.path === prefix)?.code ?? options.config.i18n.defaultLocale;
  const locale = options.config.i18n.locales.find((candidate) => candidate.code === code);
  return { lang: locale?.hreflang ?? code ?? 'en', dir: locale?.dir ?? 'ltr' };
}

/** Set document attributes in SSR and prerendered HTML, before any JavaScript runs. */
export function createSvedocsHtmlHandle(options: SvedocsHtmlHandleOptions): Handle {
  return ({ event, resolve }) => {
    const attrs = getSvedocsDocumentAttributes(options, event.url.pathname);
    let pending = '';
    let transformed = false;
    return resolve(event, {
      transformPageChunk: ({ html, done }) => {
        if (transformed) return html;
        pending += html;
        const opening = findHtmlOpeningTag(pending);
        if (!opening && !done) return '';
        let result = pending;
        if (opening) {
          const [start, end] = opening;
          const tag = pending.slice(start, end);
          const clean = tag.replace(/\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g,
            (attribute, name: string) => /^(lang|dir)$/i.test(name) ? '' : attribute);
          result = pending.slice(0, start) + clean.replace(/>$/, ` lang="${escapeAttribute(attrs.lang)}" dir="${attrs.dir}">`) + pending.slice(end);
        }
        transformed = true;
        pending = '';
        return result;
      }
    });
  };
}

/** Read complete tags rather than treating quoted > or commented tags as markup. */
function findHtmlOpeningTag(html: string): [number, number] | undefined {
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf('<', cursor);
    if (start < 0) return undefined;
    if (html.startsWith('<!--', start)) {
      const end = html.indexOf('-->', start + 4);
      if (end < 0) return undefined;
      cursor = end + 3;
      continue;
    }
    let quote = '';
    let end = start + 1;
    for (; end < html.length; end++) {
      const char = html[end]!;
      if (quote) { if (char === quote) quote = ''; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === html.length) return undefined;
    if (/^<html(?:\s|>)/i.test(html.slice(start, end + 1))) return [start, end + 1];
    cursor = end + 1;
  }
  return undefined;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
