export function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
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
