import type { SvedocsResolvedConfig } from './types.js';
import { normalizePath, stripContentExtension } from './utils.js';

export interface SvedocsRouteTarget {
  routePath: string;
  scopePath: string;
  sourcePath?: string;
  locale?: string;
  kind: 'doc' | 'page';
}

export type SvedocsPageRouteResolution<T extends SvedocsRouteTarget = SvedocsRouteTarget> =
  | { status: 'found'; page: T }
  | { status: 'redirect'; page: T; location: string; requestedLocale: string; resolvedLocale: string }
  | { status: 'missing'; requestedLocale?: string };

export interface SvedocsHrefResolution<T extends SvedocsRouteTarget = SvedocsRouteTarget> {
  href: string;
  page?: T;
  fallback: boolean;
}

export function resolveSvedocsPageRoute<T extends SvedocsRouteTarget>(
  routePath: string,
  pages: readonly T[],
  config: SvedocsResolvedConfig
): SvedocsPageRouteResolution<T> {
  const normalized = normalizeRoutePath(routePath);
  const exact = pages.find((page) => normalizeRoutePath(page.routePath) === normalized);
  if (exact) return { status: 'found', page: exact };

  const requested = resolveLocalizedScope(normalized, config);
  if (!requested) return { status: 'missing' };
  const defaultLocale = config.i18n.defaultLocale;
  if (!defaultLocale || requested.locale === defaultLocale) {
    return { status: 'missing', requestedLocale: requested.locale };
  }

  const fallback = pages.find((page) => (
    page.kind === requested.kind
    && page.scopePath === requested.scopePath
    && page.locale === defaultLocale
  ));
  if (!fallback) return { status: 'missing', requestedLocale: requested.locale };
  return {
    status: 'redirect',
    page: fallback,
    location: fallback.routePath,
    requestedLocale: requested.locale,
    resolvedLocale: defaultLocale
  };
}

export function createSvedocsRouteEntries<T extends SvedocsRouteTarget>(
  pages: readonly T[],
  config: SvedocsResolvedConfig
): string[] {
  const entries = new Set(
    pages
      .map((page) => normalizeRoutePath(page.routePath))
      .filter((routePath) => routePath !== '/')
  );
  const defaultLocale = config.i18n.defaultLocale;
  if (!defaultLocale) return [...entries];

  const defaultPages = pages.filter((page) => page.locale === defaultLocale);
  for (const page of defaultPages) {
    for (const locale of config.i18n.locales) {
      if (locale.code === defaultLocale) continue;
      const translationExists = pages.some((candidate) => (
        candidate.kind === page.kind
        && candidate.scopePath === page.scopePath
        && candidate.locale === locale.code
      ));
      if (!translationExists) entries.add(createLocalizedRoutePath(page, locale.path));
    }
  }
  return [...entries];
}

export function resolveSvedocsHref<T extends SvedocsRouteTarget>(input: {
  href: string;
  pages: readonly T[];
  config: SvedocsResolvedConfig;
  page?: SvedocsRouteTarget;
  localeCode?: string;
}): SvedocsHrefResolution<T> {
  const { pathname, suffix } = splitHref(input.href);
  if (!pathname || isNonPageHref(input.href)) return { href: input.href, fallback: false };

  const exactPath = pathname.startsWith('/') ? normalizeRoutePath(pathname) : undefined;
  const exact = exactPath
    ? input.pages.find((page) => normalizeRoutePath(page.routePath) === exactPath)
    : undefined;
  if (exact && exact.scopePath !== exactPath) {
    return { href: `${exact.routePath}${suffix}`, page: exact, fallback: false };
  }

  const scopePath = pathname.startsWith('/')
    ? normalizeContentPath(pathname)
    : input.page
      ? resolveRelativeScopePath(input.page, pathname)
      : undefined;
  if (!scopePath) return { href: input.href, fallback: false };

  const localeCode = input.localeCode ?? input.page?.locale ?? input.config.i18n.defaultLocale;
  const kind = exact?.kind ?? inferTargetKind(scopePath, input.page?.kind);
  const localized = input.pages.find((page) => (
    page.scopePath === scopePath
    && page.kind === kind
    && page.locale === localeCode
  ));
  if (localized) return { href: `${localized.routePath}${suffix}`, page: localized, fallback: false };

  const defaultLocale = input.config.i18n.defaultLocale;
  const fallback = input.pages.find((page) => (
    page.scopePath === scopePath
    && page.kind === kind
    && page.locale === defaultLocale
  ));
  if (fallback) return { href: `${fallback.routePath}${suffix}`, page: fallback, fallback: true };
  return { href: input.href, fallback: false };
}

function resolveLocalizedScope(
  routePath: string,
  config: SvedocsResolvedConfig
): { locale: string; scopePath: string; kind: 'doc' | 'page' } | undefined {
  const segments = routePath.split('/').filter(Boolean);
  const kind = segments[0] === 'docs' ? 'doc' : 'page';
  const localeIndex = kind === 'doc' ? 1 : 0;
  const locale = config.i18n.locales.find((candidate) => candidate.path === segments[localeIndex]);
  if (!locale) return undefined;
  const scopeSegments = segments.filter((_, index) => index !== localeIndex);
  return {
    locale: locale.code,
    scopePath: normalizeRoutePath(`/${scopeSegments.join('/')}`),
    kind
  };
}

function resolveRelativeScopePath(page: SvedocsRouteTarget, pathname: string): string {
  const sourceWithoutExtension = page.sourcePath ? stripContentExtension(normalizePath(page.sourcePath)) : '';
  const sourceIsIndex = sourceWithoutExtension.endsWith('/index');
  const base = sourceIsIndex || page.scopePath === '/' ? page.scopePath : dirnameRoutePath(page.scopePath);
  return normalizeContentPath(`${base}/${pathname}`);
}

function createLocalizedRoutePath(page: SvedocsRouteTarget, localePath: string): string {
  const scopeSegments = normalizeRoutePath(page.scopePath).split('/').filter(Boolean);
  if (page.kind === 'doc') {
    const docSegments = scopeSegments[0] === 'docs' ? scopeSegments.slice(1) : scopeSegments;
    return normalizeRoutePath(`/docs/${localePath}/${docSegments.join('/')}`);
  }
  return normalizeRoutePath(`/${localePath}/${scopeSegments.join('/')}`);
}

function normalizeContentPath(value: string): string {
  const normalized = normalizeRoutePath(stripContentExtension(normalizePath(value)));
  return normalized.endsWith('/index')
    ? normalized.slice(0, -'/index'.length) || '/'
    : normalized;
}

function inferTargetKind(scopePath: string, currentKind: 'doc' | 'page' | undefined): 'doc' | 'page' {
  if (scopePath === '/docs' || scopePath.startsWith('/docs/')) return 'doc';
  return currentKind === 'doc' ? 'doc' : 'page';
}

function normalizeRoutePath(value: string): string {
  const [pathname = ''] = normalizePath(value).split(/[?#]/, 1);
  const segments: string[] = [];
  for (const segment of pathname.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

function dirnameRoutePath(value: string): string {
  const segments = normalizeRoutePath(value).split('/').filter(Boolean);
  segments.pop();
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

function splitHref(href: string): { pathname: string; suffix: string } {
  const suffixIndex = href.search(/[?#]/);
  return suffixIndex < 0
    ? { pathname: href, suffix: '' }
    : { pathname: href.slice(0, suffixIndex), suffix: href.slice(suffixIndex) };
}

function isNonPageHref(href: string): boolean {
  return href.startsWith('#')
    || href.startsWith('mailto:')
    || href.startsWith('tel:')
    || /^(https?:)?\/\//.test(href)
    || /^[a-z][a-z0-9+.-]*:/i.test(href)
    || /\.(avif|gif|jpe?g|png|svg|webp|pdf|zip)([#?].*)?$/i.test(href);
}
