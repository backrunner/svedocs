import type { SvedocsSearchRecord } from '../core.js';
import { matchesSearchScope } from './local.js';
import type { SearchProvider, SearchQuery, SearchResult } from './types.js';
import { createExcerpt, stringMetadata, stringifyMetadata } from './utils.js';

export interface TypesenseSearchProviderOptions {
  host: string;
  apiKey: string;
  collection: string | ((query: SearchQuery) => string);
  queryBy?: string | string[];
  filterBy?: string | ((query: SearchQuery) => string | undefined);
  fetch?: typeof fetch;
}

interface TypesenseSearchResponse {
  hits?: TypesenseHit[];
}

interface TypesenseHit {
  document?: TypesenseDocument;
  text_match?: number;
  text_match_info?: {
    score?: number | string;
  };
}

interface TypesenseDocument {
  id?: string;
  objectID?: string;
  title?: string;
  url?: string;
  content?: string;
  section?: string;
  anchor?: string;
  locale?: string;
  kind?: string;
  metadata?: Record<string, unknown>;
  svedocs?: string;
  [key: string]: unknown;
}

export function createTypesenseSearchProvider(options: TypesenseSearchProviderOptions): SearchProvider {
  return {
    name: 'typesense',
    index() {
      // Typesense indexing is commonly handled by a crawler or CI sync script.
    },
    async search(query) {
      const requestFetch = options.fetch ?? fetch;
      const response = await requestFetch(createTypesenseSearchUrl(options, query), {
        headers: {
          'x-typesense-api-key': options.apiKey
        }
      });
      if (!response.ok) {
        throw new Error(`Typesense search returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
      }
      const payload = await response.json() as TypesenseSearchResponse;
      return (payload.hits ?? [])
        .map((hit, index) => createTypesenseResult(hit, index, query.query))
        .filter((result) => matchesSearchScope({ metadata: result.metadata } as SvedocsSearchRecord, query));
    }
  };
}

function createTypesenseSearchUrl(options: TypesenseSearchProviderOptions, query: SearchQuery): string {
  const collection = typeof options.collection === 'function' ? options.collection(query) : options.collection;
  const base = options.host.replace(/\/$/, '');
  const url = new URL(`${base}/collections/${encodeURIComponent(collection)}/documents/search`);
  url.searchParams.set('q', query.query || '*');
  url.searchParams.set('query_by', Array.isArray(options.queryBy) ? options.queryBy.join(',') : options.queryBy ?? 'title,section,content');
  url.searchParams.set('per_page', String(query.limit ?? 10));
  const filterBy = typeof options.filterBy === 'function' ? options.filterBy(query) : options.filterBy;
  if (filterBy) url.searchParams.set('filter_by', filterBy);
  return url.toString();
}

function createTypesenseResult(hit: TypesenseHit, index: number, query: string): SearchResult {
  const document = hit.document ?? {};
  const metadata = normalizeTypesenseMetadata(document);
  const section = stringMetadata(document.section) ?? stringMetadata(metadata.section);
  const content = stringMetadata(document.content) ?? stringMetadata(metadata.content) ?? stringMetadata(document.title) ?? '';
  return {
    id: stringMetadata(document.id) ?? stringMetadata(document.objectID) ?? `typesense:${index}`,
    title: stringMetadata(document.title) ?? stringMetadata(metadata.title) ?? 'Result',
    url: createTypesenseUrl(document, metadata),
    ...(section ? { section } : {}),
    excerpt: createExcerpt(content, query),
    score: createTypesenseScore(hit, index),
    metadata
  };
}

function createTypesenseUrl(document: TypesenseDocument, metadata: Record<string, string>): string {
  const url = stringMetadata(document.url) ?? stringMetadata(metadata.url) ?? '#';
  const anchor = stringMetadata(document.anchor) ?? stringMetadata(metadata.anchor);
  if (!anchor || url.includes('#')) return url;
  return `${url}#${anchor}`;
}

function normalizeTypesenseMetadata(document: TypesenseDocument): Record<string, string> {
  const metadata = stringifyMetadata({
    ...(document.metadata ?? {}),
    locale: document.locale ?? document.metadata?.locale,
    kind: document.kind ?? document.metadata?.kind
  });
  const embedded = stringMetadata(document.svedocs) ?? stringMetadata(document.metadata?.svedocs);
  if (!embedded) return metadata;
  try {
    const parsed = JSON.parse(embedded) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return metadata;
    return {
      ...metadata,
      ...stringifyMetadata(parsed)
    };
  } catch {
    return metadata;
  }
}

function createTypesenseScore(hit: TypesenseHit, index: number): number {
  if (typeof hit.text_match === 'number') return hit.text_match;
  const score = hit.text_match_info?.score;
  if (typeof score === 'number') return score;
  if (typeof score === 'string' && Number.isFinite(Number(score))) return Number(score);
  return 1 / (index + 1);
}
