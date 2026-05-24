import MiniSearch from 'minisearch';
import type { SvedocsSearchRecord } from '../core.js';
import type { SearchProvider, SearchQuery, SearchResult, SearchScope } from './types.js';
import { createExcerpt, jsonResponse, normalizeSearchText } from './utils.js';

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

const miniSearchCache = new WeakMap<SvedocsSearchRecord[], MiniSearchCacheEntry>();

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
  const query = normalizeSearchText(input.query);
  if (!query) return [];
  const entry = getMiniSearchIndex(records);
  const scoped = entry.index.search(input.query, {
    prefix: true,
    fuzzy: (term) => term.length > 4 ? 0.18 : false,
    combineWith: 'AND',
    boost: {
      title: 5,
      section: 4,
      url: 1.5,
      metadataText: 0.8,
      content: 1
    }
  }) as Array<{ id: string; score: number } & Partial<MiniSearchDocument>>;

  return scoped
    .map((hit) => {
      const record = entry.recordsById.get(hit.id);
      return record ? { record, score: Number(hit.score.toFixed(4)) } : undefined;
    })
    .filter((item): item is { record: SvedocsSearchRecord; score: number } => Boolean(item))
    .filter((item) => matchesSearchScope(item.record, input))
    .slice(0, input.limit ?? 10)
    .map(({ record, score }) => ({
      id: record.id,
      title: record.title,
      url: record.url,
      ...(record.section ? { section: record.section } : {}),
      excerpt: createExcerpt(record.content, input.query),
      score,
      metadata: record.metadata
    }));
}

export function filterSearchRecords(
  records: SvedocsSearchRecord[],
  scope: SearchScope = {}
): SvedocsSearchRecord[] {
  return records.filter((record) => matchesSearchScope(record, scope));
}

export function matchesSearchScope(record: SvedocsSearchRecord, scope: SearchScope = {}): boolean {
  return matchesMetadata(record.metadata.locale, scope.locale)
    && matchesMetadata(record.metadata.kind, scope.kind);
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

function getMiniSearchIndex(records: SvedocsSearchRecord[]): MiniSearchCacheEntry {
  const cached = miniSearchCache.get(records);
  if (cached) return cached;
  const documents = records.map(toMiniSearchDocument);
  const index = new MiniSearch<MiniSearchDocument>({
    fields: ['title', 'section', 'url', 'content', 'metadataText'],
    storeFields: ['id', 'title', 'section', 'url', 'content', 'metadata'],
    idField: 'id',
    searchOptions: {
      prefix: true,
      fuzzy: 0.18
    },
    processTerm: (term) => normalizeSearchText(term)
  });
  index.addAll(documents);
  const entry = {
    index,
    recordsById: new Map(records.map((record) => [record.id, record]))
  };
  miniSearchCache.set(records, entry);
  return entry;
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

function matchesMetadata(value: unknown, expected: string | undefined): boolean {
  if (!expected) return true;
  if (Array.isArray(value)) return value.some((item) => String(item) === expected);
  return value === expected;
}

function readScopeParam(url: URL, key: keyof SearchScope): string | undefined {
  const value = url.searchParams.get(key);
  return value?.trim() || undefined;
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(50, Math.max(1, Math.floor(value)));
}
