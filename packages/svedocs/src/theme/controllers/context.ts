import { defaultSvedocsMessages } from '../../core/config.js';
import { resolveSvedocsHref } from '../../core/routes.js';
import type { SvedocsMessageKey, SvedocsMessages, SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTranslate } from '../../core/types.js';
import type { SearchScope } from '../../search/types.js';
import type { SvedocsThemeContext } from '../types.js';

export function createThemeContext(input: {
  config: SvedocsResolvedConfig;
  page?: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsThemeContext['tree'];
  search?: SvedocsSearchRecord[];
  loadSearch?: SvedocsThemeContext['loadSearch'];
  localeCode?: string;
}): SvedocsThemeContext {
  const page = input.page;
  const localeCode = input.localeCode ?? page?.locale ?? input.config.i18n.defaultLocale ?? 'en';
  const locale = input.config.i18n.locales.find((candidate) => candidate.code === localeCode);
  const languageTag = locale?.hreflang ?? localeCode;
  const messages = resolveMessages(input.config, localeCode);
  const t = createTranslate(messages);
  const activeNavHref = resolveLocalizedActiveNavHref(
    input.config.theme.nav,
    page?.routePath ?? '/',
    input.config,
    input.pages ?? [],
    localeCode
  );
  return {
    config: input.config,
    ...(page ? { page } : {}),
    pages: input.pages ?? [],
    tree: input.tree ?? [],
    search: input.search ?? [],
    ...(input.loadSearch ? { loadSearch: input.loadSearch } : {}),
    searchScope: createRuntimeScope(input.config.search.scope, page),
    aiScope: createRuntimeScope(input.config.ai.scope, page),
    surface: page?.frontmatter.layout === 'home' || page?.scopePath === '/' ? 'home' : 'reading',
    isDocsPage: page?.kind === 'doc',
    activeNavHref,
    ...(locale ? { locale } : {}),
    localeCode,
    languageTag,
    messages,
    t
  };
}

export function resolveMessages(config: SvedocsResolvedConfig, localeCode?: string): SvedocsMessages {
  return config.i18n.messages[localeCode ?? config.i18n.defaultLocale ?? 'en']
    ?? config.i18n.messages[config.i18n.defaultLocale ?? 'en']
    ?? config.i18n.messages.en
    ?? defaultSvedocsMessages;
}

export function createTranslate(messages: SvedocsMessages): SvedocsThemeContext['t'] {
  return (key, values) => formatMessage(messages[key] ?? (defaultSvedocsMessages as SvedocsMessages)[key] ?? key, values);
}

export function formatMessage(message: string, values: Record<string, string | number> | undefined): string {
  if (!values) return message;
  return message.replace(/\{([A-Za-z0-9_.-]+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export function fallbackTranslate(key: SvedocsMessageKey, values?: Record<string, string | number>): string {
  return formatMessage((defaultSvedocsMessages as SvedocsMessages)[key] ?? key, values);
}

export function createRuntimeScope(mode: 'current' | 'all', page: SvedocsPage | undefined): SearchScope {
  if (mode === 'all' || !page) return {};
  return {
    ...(page.locale ? { locale: page.locale } : {})
  };
}

export function linkRel(item: { external?: boolean; rel?: string }): string | undefined {
  return item.external ? 'noreferrer' : item.rel;
}

export function resolveLocalizedNavItem(
  item: { label: string; labelKey?: string; href: string; external?: boolean },
  context: SvedocsThemeContext
): { label: string; labelKey?: string; href: string; external?: boolean } {
  const label = resolveLocalizedText(item.label, item.labelKey, context);
  if (item.external) return { ...item, label };
  return {
    ...item,
    label,
    href: resolveLocalizedHref(item.href, context)
  };
}

export function resolveLocalizedText(
  fallback: string,
  key: string | undefined,
  context: Pick<SvedocsThemeContext, 'messages' | 't'>
): string {
  return key && context.messages[key] !== undefined ? context.t(key) : fallback;
}

export function resolveLocalizedHref(href: string, context: SvedocsThemeContext): string {
  return resolveLocalizedHrefForLocale(href, context.config, context.pages, context.localeCode);
}

export function resolveLocaleCodeFromPath(path: string, config: SvedocsResolvedConfig): string {
  const segments = normalizePath(path).split('/').filter(Boolean);
  const localePath = segments[0] === 'docs' ? segments[1] : segments[0];
  const locale = config.i18n.locales.find((candidate) => candidate.path === decodePathSegment(localePath));
  return locale?.code ?? config.i18n.defaultLocale ?? 'en';
}

function resolveLocalizedActiveNavHref(
  nav: Array<{ href: string; external?: boolean }>,
  currentPath: string,
  config: SvedocsResolvedConfig,
  pages: SvedocsPage[],
  localeCode: string
): string {
  const localizedNav = nav.map((item) => (
    item.external
      ? item
      : {
          ...item,
          href: resolveLocalizedHrefForLocale(item.href, config, pages, localeCode)
        }
  ));
  return resolveActiveNavHref(localizedNav, currentPath);
}

function resolveLocalizedHrefForLocale(
  href: string,
  config: SvedocsResolvedConfig,
  pages: SvedocsPage[],
  localeCode: string
): string {
  return resolveSvedocsHref({ href, pages, config, localeCode }).href;
}

export function isActiveNavItem(item: { href: string; external?: boolean }, activeNavHref: string): boolean {
  return !item.external && normalizePath(item.href) === activeNavHref;
}

export function handleSamePathNavClick(event: MouseEvent, href: string, external?: boolean): void {
  if (external) return;
  if (event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (typeof window === 'undefined') return;

  const target = createComparableUrl(href, window.location.href);
  if (!target) return;

  const current = createComparableUrl(window.location.href, window.location.href);
  if (target === current) event.preventDefault();
}

export function createDomId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'site';
}

export function resolveActiveNavHref(nav: Array<{ href: string; external?: boolean }>, currentPath: string): string {
  const normalizedCurrentPath = normalizePath(currentPath);
  let activeHref = '';

  for (const item of nav) {
    if (item.external) continue;

    const normalizedHref = normalizePath(item.href);
    if (!isPathMatch(normalizedCurrentPath, normalizedHref)) continue;

    if (normalizedHref.length > activeHref.length) activeHref = normalizedHref;
  }

  return activeHref;
}

export function normalizePath(path: string): string {
  const pathname = getPathname(path);
  const withoutTrailingSlash = pathname.replace(/\/+$/, '');
  return withoutTrailingSlash ? withoutTrailingSlash : '/';
}

function isPathMatch(currentPath: string, hrefPath: string): boolean {
  if (hrefPath === '/') return currentPath === '/';
  return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`);
}

function getPathname(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      return new URL(path).pathname;
    } catch {
      return path;
    }
  }

  return path.split(/[?#]/, 1)[0] || '/';
}

function decodePathSegment(segment: string | undefined): string | undefined {
  if (!segment) return undefined;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function createComparableUrl(value: string, base: string): string | undefined {
  try {
    const url = new URL(value, base);
    url.pathname = normalizePath(url.pathname);
    return url.href;
  } catch {
    return undefined;
  }
}
