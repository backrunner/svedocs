import MiniSearch from 'minisearch';
import { matchesSearchScope } from './scope.js';
export { filterSearchRecords, matchesSearchScope } from './scope.js';
import type { SvedocsSearchRecord } from '../core.js';
import type { SearchProvider, SearchQuery, SearchResult, SearchScope } from './types.js';
import { analyzeSearchQuery, createExcerpt, jsonResponse, normalizeSearchText, tokenizeSearchText } from './utils.js';

interface MiniSearchDocument {
  id: string;
  title: string;
  section: string;
  url: string;
  content: string;
  metadataText: string;
  metadata: SvedocsSearchRecord['metadata'];
}

interface MiniSearchCacheEntry {
  index: MiniSearch<MiniSearchDocument>;
  recordsById: Map<string, SvedocsSearchRecord>;
}

interface LocalSearchHit {
  record: SvedocsSearchRecord;
  score: number;
}

const miniSearchCache = new WeakMap<SvedocsSearchRecord[], MiniSearchCacheEntry>();
const localSearchBoost = {
  title: 5,
  section: 4,
  url: 1.5,
  metadataText: 0.8,
  content: 1
};

export function createLocalSearchProvider(records: SvedocsSearchRecord[] = []): SearchProvider {
  let indexed = records;
  return {
    name: 'local-json',
    index(nextRecords) {
      indexed = nextRecords;
    },
    search(input) {
      return searchRecords(indexed, input);
    }
  };
}

export const localSearchProvider = createLocalSearchProvider();

export function searchRecords(records: SvedocsSearchRecord[], input: SearchQuery): SearchResult[] {
  const { normalized: query, terms, tokens } = analyzeSearchQuery(input.query);
  if (!query) return [];
  const limit = input.limit ?? 10;
  const entry = getMiniSearchIndex(records);
  const primary = runLocalSearch(entry, input, 'AND', query, terms, tokens);
  const selected = primary.slice(0, limit);
  if (selected.length < limit && terms.length > 1) {
    const seen = new Set(selected.map((hit) => hit.record.id));
    const fallbackScoreCeiling = selected.at(-1)?.score;
    selected.push(
      ...runLocalSearch(entry, input, 'OR', query, terms, tokens)
        .filter((hit) => !seen.has(hit.record.id))
        .map((hit) => ({
          ...hit,
          score: fallbackScoreCeiling ? Math.min(hit.score * 0.6, fallbackScoreCeiling * 0.95) : hit.score * 0.6
        }))
        .slice(0, limit - selected.length)
    );
  }

  return selected.map(({ record, score }) => ({
    id: record.id,
    title: record.title,
    url: record.url,
    ...(record.section ? { section: record.section } : {}),
    excerpt: createExcerpt(record.content, input.query, terms),
    score,
    metadata: record.metadata
  }));
}

function runLocalSearch(
  entry: MiniSearchCacheEntry,
  input: SearchQuery,
  combineWith: 'AND' | 'OR',
  normalizedQuery: string,
  terms: string[],
  tokens: string[]
): LocalSearchHit[] {
  const scoped = entry.index.search(input.query, {
    tokenize: () => tokens,
    processTerm: (term) => term,
    prefix: true,
    fuzzy: (term) => term.length > 4 ? 0.18 : false,
    combineWith,
    boost: localSearchBoost
  }) as Array<{ id: string; score: number } & Partial<MiniSearchDocument>>;

  return scoped
    .map((hit) => {
      const record = entry.recordsById.get(hit.id);
      return record && matchesSearchScope(record, input) ? { record, score: scoreLocalSearchHit(record, hit.score, normalizedQuery, terms) } : undefined;
    })
    .filter((item): item is { record: SvedocsSearchRecord; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .map((hit) => ({ ...hit, score: Number(hit.score.toFixed(4)) }));
}

export async function createSearchResponse(records: SvedocsSearchRecord[], request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? url.searchParams.get('query') ?? '';
  const limit = clampLimit(Number(url.searchParams.get('limit') ?? 10));
  const locale = readScopeParam(url, 'locale');
  const kind = readScopeParam(url, 'kind');
  const results = searchRecords(records, {
    query,
    limit,
    ...(locale ? { locale } : {}),
    ...(kind ? { kind } : {})
  });
  return jsonResponse({ query, results });
}

function createMiniSearchIndex(records: SvedocsSearchRecord[]): MiniSearchCacheEntry {
  return {
    index: new MiniSearch<MiniSearchDocument>({
      fields: ['title', 'section', 'url', 'content', 'metadataText'],
      storeFields: [],
      idField: 'id',
      searchOptions: { prefix: true, fuzzy: 0.18 },
      tokenize: tokenizeSearchText,
      processTerm: (term) => normalizeSearchText(term) || false
    }),
    recordsById: new Map(records.map((record) => [record.id, record]))
  };
}

function getMiniSearchIndex(records: SvedocsSearchRecord[]): MiniSearchCacheEntry {
  const cached = miniSearchCache.get(records);
  if (cached) return cached;
  const entry = createMiniSearchIndex(records);
  entry.index.addAll(records.map(toMiniSearchDocument));
  miniSearchCache.set(records, entry);
  return entry;
}

const preparing = new WeakMap<SvedocsSearchRecord[], Promise<void>>();

/** Yield on the UI thread; Workers can build continuously without blocking input. */
export async function prepareSearchIndex(records: SvedocsSearchRecord[], cooperative = true): Promise<void> {
  if (miniSearchCache.has(records)) return;
  const existing = preparing.get(records);
  if (existing) return existing;
  const pending = (async () => {
    const entry = createMiniSearchIndex(records);
    let started = performance.now();
    for (const record of records) {
      entry.index.add(toMiniSearchDocument(record));
      if (cooperative && performance.now() - started >= 8) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        started = performance.now();
      }
    }
    if (!miniSearchCache.has(records)) miniSearchCache.set(records, entry);
  })();
  preparing.set(records, pending);
  try { await pending; } finally { preparing.delete(records); }
}

function toMiniSearchDocument(record: SvedocsSearchRecord): MiniSearchDocument {
  return {
    id: record.id,
    title: record.title,
    section: record.section ?? '',
    url: record.url,
    content: record.content,
    metadataText: Object.values(record.metadata).flat().join(' '),
    metadata: record.metadata
  };
}

function scoreLocalSearchHit(record: SvedocsSearchRecord, score: number, normalizedQuery: string, terms: string[]): number {
  const title = normalizeSearchText(record.title);
  const section = normalizeSearchText(record.section ?? '');
  const url = normalizeSearchText(record.url);
  const sourcePath = normalizeSearchText(typeof record.metadata.sourcePath === 'string' ? record.metadata.sourcePath : '');
  let multiplier = 1;
  if (title === normalizedQuery || section === normalizedQuery) {
    multiplier *= 1.6;
  } else if (title.startsWith(normalizedQuery) || section.startsWith(normalizedQuery)) {
    multiplier *= 1.35;
  } else if (title.includes(normalizedQuery) || section.includes(normalizedQuery)) {
    multiplier *= 1.2;
  } else if (terms.length > 1 && terms.every((term) => title.includes(term) || section.includes(term))) {
    multiplier *= 1.15;
  }
  if (url.includes(normalizedQuery) || sourcePath.includes(normalizedQuery)) multiplier *= 1.1;
  return score * multiplier;
}

function readScopeParam(url: URL, key: keyof SearchScope): string | undefined {
  const value = url.searchParams.get(key);
  return value?.trim() || undefined;
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(50, Math.max(1, Math.floor(value)));
}
