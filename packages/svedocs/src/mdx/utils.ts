export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_\-|~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripInlineMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();
}

export function parseLineSet(value: string | undefined, lineCount: number): number[] {
  if (!value) return [];
  const lines = new Set<number>();
  for (const part of value.split(',')) {
    const [startRaw, endRaw] = part.trim().split('-');
    const start = Number(startRaw);
    const end = Number(endRaw ?? startRaw);
    if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
    for (let line = Math.max(1, Math.min(start, end)); line <= Math.min(lineCount, Math.max(start, end)); line += 1) {
      lines.add(line);
    }
  }
  return [...lines].sort((a, b) => a - b);
}

export function mergeHtmlClass(attrs: string, className: string): string {
  const match = /class="([^"]*)"/.exec(attrs);
  const classes = new Set([...(match?.[1]?.split(/\s+/).filter(Boolean) ?? []), className]);
  return [...classes].join(' ');
}

export function mergeClassNames(value: unknown, className: string): string[] {
  const classes = Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(/\s+/) : [];
  return [...new Set([...classes, className])];
}

export function normalizeShikiLanguage(language: string): string {
  if (language === 'txt') return 'text';
  if (language === 'sh' || language === 'shell') return 'bash';
  return language || 'text';
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}
