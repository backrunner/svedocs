import { createHash } from 'node:crypto';
import type { SvedocsResolvedConfig } from './types.js';
import { normalizePath } from './utils.js';

export function inferKind(file: string, config: SvedocsResolvedConfig): 'doc' | 'page' {
  return normalizePath(file).startsWith(`${normalizePath(config.content.docs)}/`) ? 'doc' : 'page';
}

export interface SvedocsRouteInfo {
  routePath: string;
  scopePath: string;
  slug: string[];
  locale?: string;
}

export function createRouteInfo(file: string, kind: 'doc' | 'page', config: SvedocsResolvedConfig, slug?: string): SvedocsRouteInfo {
  const normalized = normalizePath(file);
  const base = normalizePath(kind === 'doc' ? config.content.docs : config.content.pages);
  const relative = normalized.startsWith(`${base}/`) ? normalized.slice(base.length + 1) : normalized;
  const withoutExt = relative.replace(/\.(md|mdx|svx)$/, '');
  const rawParts = withoutExt.split('/').filter(Boolean);
  const parts = rawParts.at(-1) === 'index' ? rawParts.slice(0, -1) : [...rawParts];
  const routeParts = kind === 'doc' ? ['docs'] : [];
  const locale = consumeLocale(parts, config);
  const scopeParts = [...parts];
  if (slug && parts.length > 0) parts[parts.length - 1] = slug;

  if (locale && shouldPrefixLocale(locale, config)) {
    routeParts.push(findLocalePath(locale, config) ?? locale);
  }
  routeParts.push(...parts);

  const routePath = `/${routeParts.join('/')}`.replace(/\/$/, '') || '/';
  const scopePath = `/${[...(kind === 'doc' ? ['docs'] : []), ...scopeParts].join('/')}`.replace(/\/$/, '') || '/';
  return {
    routePath,
    scopePath,
    slug: routePath.split('/').filter(Boolean),
    ...(locale ? { locale } : {})
  };
}

function consumeLocale(parts: string[], config: SvedocsResolvedConfig): string | undefined {
  if (config.i18n.locales.length === 0) return undefined;
  const match = config.i18n.locales.find((locale) => locale.path === parts[0]);
  if (match) {
    parts.shift();
    return match.code;
  }
  return config.i18n.defaultLocale;
}

function shouldPrefixLocale(locale: string, config: SvedocsResolvedConfig): boolean {
  return config.i18n.prefixDefaultLocale || locale !== config.i18n.defaultLocale;
}

function findLocalePath(locale: string, config: SvedocsResolvedConfig): string | undefined {
  return config.i18n.locales.find((item) => item.code === locale)?.path;
}

function createPageId(file: string): string {
  return normalizePath(file).replace(/\.(md|mdx|svx)$/, '').replace(/[^a-zA-Z0-9]+/g, '-');
}

export function assignUniquePageIds<T extends { file: string }>(entries: T[]): Array<T & { id: string }> {
  const candidates = entries.map((entry) => createPageId(entry.file));
  const counts = new Map<string, number>();
  for (const candidate of candidates) counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
  return entries.map((entry, index) => {
    const candidate = candidates[index] ?? createPageId(entry.file);
    if ((counts.get(candidate) ?? 0) === 1) return { ...entry, id: candidate };
    const digest = createHash('sha256').update(normalizePath(entry.file)).digest('hex').slice(0, 10);
    return { ...entry, id: `${candidate}-${digest}` };
  });
}

