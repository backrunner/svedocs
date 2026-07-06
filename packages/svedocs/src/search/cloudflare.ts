import type { SvedocsSearchRecord } from '../core.js';
import type {
  CloudflareAiSearchChunk,
  CloudflareAiSearchInput,
  CloudflareAiSearchInstance,
  CloudflareAiSearchItem,
  CloudflareAiSearchOutput,
  CloudflareAiSearchNamespace,
  SearchResult,
  SearchScope,
  SearchProvider
} from './types.js';
import { matchesSearchScope } from './local.js';
import { createExcerpt, stringMetadata, stringifyMetadata } from './utils.js';

export function createCloudflareAiSearchProvider(input: {
  binding: CloudflareAiSearchInstance | CloudflareAiSearchNamespace;
  instanceName?: string;
}): SearchProvider {
  return {
    name: 'cloudflare-ai-search',
    index() {
      // Cloudflare AI Search indexing is intentionally handled by CLI/provider sync.
    },
    async search(query) {
      const maxResults = query.limit ?? 10;
      const filters = createCloudflareAiSearchScopeFilters(query);
      const result = await runCloudflareAiSearch(input.binding, input.instanceName, {
        messages: [
          {
            role: 'user',
            content: query.query
          }
        ],
        ai_search_options: {
          retrieval: {
            retrieval_type: 'hybrid',
            max_num_results: maxResults,
            ...(filters ? { filters } : {})
          }
        }
      });
      return normalizeCloudflareAiSearchResults(result, query.query)
        .filter((record) => matchesSearchScope({ metadata: record.metadata } as SvedocsSearchRecord, query));
    }
  };
}

export async function runCloudflareAiSearch(
  binding: CloudflareAiSearchInstance | CloudflareAiSearchNamespace,
  instanceName = 'svedocs',
  input: CloudflareAiSearchInput
): Promise<CloudflareAiSearchOutput> {
  const instance = resolveAiSearchInstance(binding, instanceName);
  const aiSearchOptions = createAiSearchOptions(input);
  const messages = input.messages;
  return instance.search({
    ...(messages ? { messages } : {}),
    ...(!messages && input.query ? { query: input.query } : {}),
    ...(aiSearchOptions ? { ai_search_options: aiSearchOptions } : {})
  });
}

export function normalizeCloudflareAiSearchResults(result: CloudflareAiSearchOutput, query: string): SearchResult[] {
  if (result.data?.length) {
    return result.data.map((item, index) => createResultFromItem(item, index, query, result.response ?? result.answer));
  }
  return (result.chunks ?? []).map((chunk, index) => createResultFromChunk(chunk, index, query, result.response ?? result.answer));
}

export function resolveAiSearchInstance(
  binding: CloudflareAiSearchInstance | CloudflareAiSearchNamespace,
  instanceName = 'svedocs'
): CloudflareAiSearchInstance {
  return 'get' in binding ? binding.get(instanceName) : binding;
}

export function createCloudflareAiSearchScopeFilters(scope: SearchScope = {}): Record<string, unknown> | undefined {
  const filters = {
    ...(scope.locale ? { locale: scope.locale } : {}),
    ...(scope.kind ? { kind: scope.kind } : {})
  };
  return Object.keys(filters).length > 0 ? filters : undefined;
}

function mergeRetrieval(
  options: CloudflareAiSearchInput['ai_search_options'],
  retrieval: NonNullable<NonNullable<CloudflareAiSearchInput['ai_search_options']>['retrieval']>
): NonNullable<CloudflareAiSearchInput['ai_search_options']> {
  return {
    ...(options ?? {}),
    retrieval: {
      ...(options?.retrieval ?? {}),
      ...retrieval
    }
  };
}

function createAiSearchOptions(
  input: CloudflareAiSearchInput
): NonNullable<CloudflareAiSearchInput['ai_search_options']> | undefined {
  const retrieval = typeof input.max_num_results === 'number' ? { max_num_results: input.max_num_results } : {};
  return input.ai_search_options || Object.keys(retrieval).length > 0
    ? mergeRetrieval(input.ai_search_options, retrieval)
    : undefined;
}

function createResultFromItem(
  item: CloudflareAiSearchItem,
  index: number,
  query: string,
  fallbackContent = ''
) {
  const metadata = normalizeCloudflareMetadata(item.metadata ?? {});
  const section = stringMetadata(metadata.section);
  return {
    id: item.id ?? `cloudflare:${index}`,
    title: item.title ?? stringMetadata(metadata.title) ?? 'Result',
    url: item.url ?? stringMetadata(metadata.url) ?? '#',
    ...(section ? { section } : {}),
    excerpt: createExcerpt(item.content ?? item.text ?? fallbackContent, query),
    score: typeof item.score === 'number' ? item.score : 1 / (index + 1),
    metadata
  };
}

function createResultFromChunk(
  chunk: CloudflareAiSearchChunk,
  index: number,
  query: string,
  fallbackContent = ''
) {
  const metadata = normalizeCloudflareMetadata({
    ...(chunk.attributes ?? {}),
    ...(chunk.metadata ?? {}),
    ...(chunk.item?.metadata ?? {})
  });
  const section = stringMetadata(metadata.section);
  return {
    id: chunk.id ?? stringMetadata(chunk.item?.id) ?? stringMetadata(chunk.item?.key) ?? `cloudflare:${index}`,
    title:
      stringMetadata(metadata.title) ??
      stringMetadata(chunk.item?.title) ??
      stringMetadata(chunk.item?.filename) ??
      stringMetadata(chunk.item?.key) ??
      'Result',
    url: stringMetadata(metadata.url) ?? stringMetadata(metadata.source_url) ?? '#',
    ...(section ? { section } : {}),
    excerpt: createExcerpt(chunk.text ?? chunk.content ?? stringMetadata(metadata.content) ?? fallbackContent, query),
    score: typeof chunk.score === 'number' ? chunk.score : 1 / (index + 1),
    metadata
  };
}

function normalizeCloudflareMetadata(metadata: Record<string, unknown>): Record<string, string> {
  const stringified = stringifyMetadata(metadata);
  const embedded = stringMetadata(metadata.svedocs);
  if (!embedded) return stringified;
  try {
    const parsed = JSON.parse(embedded) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return stringified;
    return {
      ...stringified,
      ...stringifyMetadata(parsed)
    };
  } catch {
    return stringified;
  }
}
