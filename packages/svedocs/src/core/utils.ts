export function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

/** Route identity ignores query/hash and resolves dot segments consistently. */
export function normalizeRoutePath(value: string): string {
  const [pathname = ''] = normalizePath(value).split(/[?#]/, 1);
  const segments: string[] = [];
  for (const segment of pathname.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return segments.length ? `/${segments.join('/')}` : '/';
}

export function routeTrailingSlash(mode: 'edge' | 'static' | 'spa'): 'always' | 'never' {
  return mode === 'edge' ? 'never' : 'always';
}

export function formatRoutePathForBuildMode(routePath: string, mode: 'edge' | 'static' | 'spa'): string {
  const suffixIndex = routePath.search(/[?#]/);
  const suffix = suffixIndex < 0 ? '' : routePath.slice(suffixIndex);
  const normalized = normalizeRoutePath(routePath);
  return `${normalized}${normalized !== '/' && routeTrailingSlash(mode) === 'always' ? '/' : ''}${suffix}`;
}

export function stripContentExtension(value: string): string {
  return value.replace(/\.(md|mdx|svx)$/i, '');
}

export function stripInlineMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

export function titleFromSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function stringFrontmatter(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function numberFrontmatter(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function booleanFrontmatter(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function stringArrayFrontmatter(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

export function slugFrontmatter(value: unknown): string | undefined {
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : stringFrontmatter(value);
  const text = raw?.replace(/^\/+|\/+$/g, '');
  if (!text || text === '.' || text === '..' || text === 'index') return undefined;
  if (text.includes('/') || text.includes('..') || text.includes('#') || text.includes('?') || /\s/.test(text)) return undefined;
  return text;
}

export function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function createGroupId(value: string): string {
  return `group-${value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}
