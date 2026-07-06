export function createExcerpt(content: string, query: string): string {
  const terms = tokenizeSearchQuery(query);
  const haystack = content.toLowerCase();
  const index = terms.reduce((best, term) => {
    const next = haystack.indexOf(term);
    if (next < 0) return best;
    return best < 0 ? next : Math.min(best, next);
  }, -1);
  if (index < 0) return content.slice(0, 160);
  const start = Math.max(0, index - 60);
  return content.slice(start, start + 180).trim();
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return normalized.split(/\s+/).flatMap(tokenizeSearchSegment);
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

export function stringMetadata(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function stringifyMetadata(metadata: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)])
  );
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const safeSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }
  return chunks;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenizeSearchSegment(segment: string): string[] {
  const tokens: string[] = [];
  let run = '';
  let runIsCjk: boolean | undefined;
  for (const char of Array.from(segment)) {
    const charIsCjk = isCjkSearchChar(char);
    if (run && charIsCjk !== runIsCjk) {
      tokens.push(...tokenizeSearchRun(run, runIsCjk === true));
      run = '';
    }
    run += char;
    runIsCjk = charIsCjk;
  }
  if (run) tokens.push(...tokenizeSearchRun(run, runIsCjk === true));
  return tokens;
}

function tokenizeSearchRun(run: string, cjk: boolean): string[] {
  if (!cjk) return [run];
  const chars = Array.from(run);
  const tokens = [...chars];
  for (let size = 2; size <= Math.min(3, chars.length); size += 1) {
    for (let index = 0; index <= chars.length - size; index += 1) {
      tokens.push(chars.slice(index, index + size).join(''));
    }
  }
  return tokens;
}

function isCjkSearchChar(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/u.test(value);
}
