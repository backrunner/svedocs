import type { SvedocsSearchRecord } from '../core.js';
import { matchesSearchScope } from './local.js';
import type { SearchProvider, SearchQuery, SearchResult } from './types.js';
import { createExcerpt, sanitizeNavigationUrl, stringMetadata, stringifyMetadata } from './utils.js';

export interface AlgoliaSearchProviderOptions {
  appId: string;
  apiKey: string;
  indexName: string;
  filters?: string | ((query: SearchQuery) => string | undefined);
  fetch?: typeof fetch;
}

interface AlgoliaSearchResponse {
  hits?: AlgoliaHit[];
}

interface AlgoliaHit {
  objectID?: string;
  title?: string;
  url?: string;
  content?: string;
  section?: string;
  anchor?: string;
  hierarchy?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  locale?: string;
  kind?: string;
  _snippetResult?: Record<string, {
    value?: string;
  }>;
  _highlightResult?: Record<string, {
    value?: string;
  }>;
}

export function createAlgoliaSearchProvider(options: AlgoliaSearchProviderOptions): SearchProvider {
  return {
    name: 'algolia',
    index() {
      // Algolia indexing is usually handled by DocSearch crawlers or user CI.
    },
    async search(query) {
      const requestFetch = options.fetch ?? fetch;
      const filters = createAlgoliaFilters(options, query);
      const response = await requestFetch(createAlgoliaQueryEndpoint(options), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-algolia-application-id': options.appId,
          'x-algolia-api-key': options.apiKey
        },
        body: JSON.stringify({
          query: query.query,
          hitsPerPage: query.limit ?? 10,
          ...(filters ? { filters } : {}),
          attributesToSnippet: ['content:30']
        }),
        signal: query.signal ? AbortSignal.any([query.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000)
      });
      if (!response.ok) {
        throw new Error(`Algolia search returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
      }
      const payload = await response.json() as AlgoliaSearchResponse;
      return (payload.hits ?? [])
        .map((hit, index) => createAlgoliaResult(hit, index, query.query))
        .filter((result) => matchesSearchScope({ metadata: result.metadata } as SvedocsSearchRecord, query));
    }
  };
}

function createAlgoliaQueryEndpoint(options: AlgoliaSearchProviderOptions): string {
  return `https://${encodeURIComponent(options.appId)}-dsn.algolia.net/1/indexes/${encodeURIComponent(options.indexName)}/query`;
}

function createAlgoliaFilters(options: AlgoliaSearchProviderOptions, query: SearchQuery): string | undefined {
  return typeof options.filters === 'function' ? options.filters(query) : options.filters;
}

function createAlgoliaResult(hit: AlgoliaHit, index: number, query: string): SearchResult {
  const metadata = stringifyMetadata({
    ...(hit.metadata ?? {}),
    locale: hit.locale ?? hit.metadata?.locale,
    kind: hit.kind ?? hit.metadata?.kind
  });
  const hierarchyTitle = readHierarchy(hit.hierarchy, ['lvl0', 'lvl1', 'lvl2']);
  const title = hit.title ?? hierarchyTitle ?? 'Result';
  const section = hit.section ?? readHierarchy(hit.hierarchy, ['lvl6', 'lvl5', 'lvl4', 'lvl3', 'lvl2', 'lvl1']);
  const content = stripHtml(readSnippet(hit) ?? hit.content ?? title);
  return {
    id: hit.objectID ?? `algolia:${index}`,
    title,
    url: createAlgoliaUrl(hit),
    ...(section && section !== title ? { section } : {}),
    excerpt: createExcerpt(content, query),
    score: 1 / (index + 1),
    metadata
  };
}

function createAlgoliaUrl(hit: AlgoliaHit): string {
  const url = hit.url ?? '#';
  if (!hit.anchor || url.includes('#')) return sanitizeNavigationUrl(url);
  return sanitizeNavigationUrl(`${url}#${hit.anchor}`);
}

function readSnippet(hit: AlgoliaHit): string | undefined {
  return stringMetadata(hit._snippetResult?.content?.value)
    ?? stringMetadata(hit._highlightResult?.content?.value);
}

function readHierarchy(hierarchy: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = stringMetadata(hierarchy?.[key]);
    if (value) return stripHtml(value);
  }
  return undefined;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}
