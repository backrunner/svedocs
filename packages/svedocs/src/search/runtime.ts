import type { SvedocsResolvedConfig, SvedocsSearchRecord } from '../core.js';
import { createAlgoliaSearchProvider } from './algolia.js';
import { createCloudflareAiSearchProvider } from './cloudflare.js';
import { createLocalSearchProvider, createSearchResponse } from './local.js';
import { createTypesenseSearchProvider } from './typesense.js';
import type {
  CloudflareAiSearchBinding,
  CloudflareAiSearchInstance,
  CloudflareAiSearchNamespace,
  SearchProvider,
  SearchQuery,
  SearchScope
} from './types.js';
import { jsonResponse } from './utils.js';

export interface SvedocsSearchRuntimeEnv {
  SVEDOCS_AI_SEARCH?: CloudflareAiSearchInstance | CloudflareAiSearchNamespace | CloudflareAiSearchBinding | undefined;
  ALGOLIA_APP_ID?: string | undefined;
  ALGOLIA_SEARCH_KEY?: string | undefined;
  ALGOLIA_API_KEY?: string | undefined;
  ALGOLIA_INDEX_NAME?: string | undefined;
  SVEDOCS_ALGOLIA_APP_ID?: string | undefined;
  SVEDOCS_ALGOLIA_SEARCH_KEY?: string | undefined;
  SVEDOCS_ALGOLIA_API_KEY?: string | undefined;
  SVEDOCS_ALGOLIA_INDEX_NAME?: string | undefined;
  TYPESENSE_HOST?: string | undefined;
  TYPESENSE_URL?: string | undefined;
  TYPESENSE_SEARCH_KEY?: string | undefined;
  TYPESENSE_API_KEY?: string | undefined;
  TYPESENSE_COLLECTION?: string | undefined;
  TYPESENSE_COLLECTION_NAME?: string | undefined;
  SVEDOCS_TYPESENSE_HOST?: string | undefined;
  SVEDOCS_TYPESENSE_URL?: string | undefined;
  SVEDOCS_TYPESENSE_SEARCH_KEY?: string | undefined;
  SVEDOCS_TYPESENSE_API_KEY?: string | undefined;
  SVEDOCS_TYPESENSE_COLLECTION?: string | undefined;
  SVEDOCS_TYPESENSE_COLLECTION_NAME?: string | undefined;
  [key: string]: unknown;
}

export interface CreateConfiguredSearchProviderOptions {
  config: Pick<SvedocsResolvedConfig, 'search' | 'cloudflare'>;
  records?: SvedocsSearchRecord[];
  env?: SvedocsSearchRuntimeEnv;
  provider?: string;
  fetch?: typeof fetch;
}

export interface CreateConfiguredSearchResponseOptions extends Omit<CreateConfiguredSearchProviderOptions, 'config' | 'records' | 'provider'> {
  provider?: string;
}

export function createConfiguredSearchProvider(options: CreateConfiguredSearchProviderOptions): SearchProvider {
  const provider = normalizeProviderName(options.provider ?? options.config.search.provider);
  const records = options.records ?? [];
  if (!options.config.search.enabled) return createDisabledSearchProvider();
  if (provider === 'cloudflare-ai-search') {
    const binding = readCloudflareAiSearchBinding(options.env, options.config);
    if (binding) {
      return createCloudflareAiSearchProvider({
        binding,
        instanceName: options.config.cloudflare.aiSearch.instanceName
      });
    }
    return createLocalSearchProvider(records);
  }
  if (provider === 'algolia') {
    const appId = readFirstEnv(options.env, ['SVEDOCS_ALGOLIA_APP_ID', 'ALGOLIA_APP_ID']);
    const apiKey = readFirstEnv(options.env, ['SVEDOCS_ALGOLIA_SEARCH_KEY', 'SVEDOCS_ALGOLIA_API_KEY', 'ALGOLIA_SEARCH_KEY', 'ALGOLIA_API_KEY']);
    const indexName = readFirstEnv(options.env, ['SVEDOCS_ALGOLIA_INDEX_NAME', 'ALGOLIA_INDEX_NAME']);
    if (appId && apiKey && indexName) {
      return createAlgoliaSearchProvider({
        appId,
        apiKey,
        indexName,
        filters: createAlgoliaScopeFilters,
        ...(options.fetch ? { fetch: options.fetch } : {})
      });
    }
    return createLocalSearchProvider(records);
  }
  if (provider === 'typesense') {
    const host = readFirstEnv(options.env, ['SVEDOCS_TYPESENSE_HOST', 'SVEDOCS_TYPESENSE_URL', 'TYPESENSE_HOST', 'TYPESENSE_URL']);
    const apiKey = readFirstEnv(options.env, ['SVEDOCS_TYPESENSE_SEARCH_KEY', 'SVEDOCS_TYPESENSE_API_KEY', 'TYPESENSE_SEARCH_KEY', 'TYPESENSE_API_KEY']);
    const collection = readFirstEnv(options.env, [
      'SVEDOCS_TYPESENSE_COLLECTION',
      'SVEDOCS_TYPESENSE_COLLECTION_NAME',
      'TYPESENSE_COLLECTION',
      'TYPESENSE_COLLECTION_NAME'
    ]) ?? 'docs';
    if (host && apiKey) {
      return createTypesenseSearchProvider({
        host,
        apiKey,
        collection,
        filterBy: createTypesenseScopeFilters,
        ...(options.fetch ? { fetch: options.fetch } : {})
      });
    }
    return createLocalSearchProvider(records);
  }
  return createLocalSearchProvider(records);
}

export async function createConfiguredSearchResponse(
  config: Pick<SvedocsResolvedConfig, 'search' | 'cloudflare'>,
  records: SvedocsSearchRecord[],
  request: Request,
  options: CreateConfiguredSearchResponseOptions = {}
): Promise<Response> {
  if (!config.search.enabled) {
    return jsonResponse({ query: readSearchQuery(request).query, results: [] });
  }
  const providerName = options.provider ?? readProviderParam(request) ?? config.search.provider;
  const provider = createConfiguredSearchProvider({
    config,
    records,
    provider: providerName,
    ...(options.env ? { env: options.env } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {})
  });
  if (provider.name === 'local-json' || provider.name === 'disabled') {
    return createSearchResponse(records, request);
  }
  const query = readSearchQuery(request);
  const results = await provider.search(query);
  return jsonResponse({ query: query.query, provider: provider.name, results });
}

export function readSearchQuery(request: Request): SearchQuery {
  const url = new URL(request.url);
  const locale = readScopeParam(url, 'locale');
  const version = readScopeParam(url, 'version');
  const kind = readScopeParam(url, 'kind');
  return {
    query: url.searchParams.get('q') ?? url.searchParams.get('query') ?? '',
    limit: clampLimit(Number(url.searchParams.get('limit') ?? 10)),
    ...(locale ? { locale } : {}),
    ...(version ? { version } : {}),
    ...(kind ? { kind } : {})
  };
}

export function readProviderParam(request: Request): string | undefined {
  const provider = new URL(request.url).searchParams.get('provider')?.trim();
  return provider || undefined;
}

function createDisabledSearchProvider(): SearchProvider {
  return {
    name: 'disabled',
    index() {},
    search() {
      return [];
    }
  };
}

function readCloudflareAiSearchBinding(
  env: SvedocsSearchRuntimeEnv | undefined,
  config: Pick<SvedocsResolvedConfig, 'cloudflare'>
): CloudflareAiSearchInstance | CloudflareAiSearchNamespace | CloudflareAiSearchBinding | undefined {
  const bindingName = config.cloudflare.aiSearch.binding;
  const dynamicBinding = env?.[bindingName];
  if (isCloudflareAiSearchBinding(dynamicBinding)) return dynamicBinding;
  if (isCloudflareAiSearchBinding(env?.SVEDOCS_AI_SEARCH)) return env.SVEDOCS_AI_SEARCH;
  return undefined;
}

function isCloudflareAiSearchBinding(
  value: unknown
): value is CloudflareAiSearchInstance | CloudflareAiSearchNamespace | CloudflareAiSearchBinding {
  if (!value || typeof value !== 'object') return false;
  return (
    'search' in value || 'get' in value || 'autorag' in value
  );
}

function readFirstEnv(env: SvedocsSearchRuntimeEnv | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function createAlgoliaScopeFilters(query: SearchScope): string | undefined {
  return [
    query.locale ? `locale:${quoteAlgoliaFilterValue(query.locale)}` : undefined,
    query.version ? `version:${quoteAlgoliaFilterValue(query.version)}` : undefined,
    query.kind ? `kind:${quoteAlgoliaFilterValue(query.kind)}` : undefined
  ].filter(Boolean).join(' AND ') || undefined;
}

function quoteAlgoliaFilterValue(value: string): string {
  return /^[\w-]+$/.test(value) ? value : JSON.stringify(value);
}

function createTypesenseScopeFilters(query: SearchScope): string | undefined {
  return [
    query.locale ? `locale:=${quoteTypesenseFilterValue(query.locale)}` : undefined,
    query.version ? `version:=${quoteTypesenseFilterValue(query.version)}` : undefined,
    query.kind ? `kind:=${quoteTypesenseFilterValue(query.kind)}` : undefined
  ].filter(Boolean).join(' && ') || undefined;
}

function quoteTypesenseFilterValue(value: string): string {
  return /^[\w-]+$/.test(value) ? value : `\`${value.replace(/`/g, '\\`')}\``;
}

function normalizeProviderName(provider: string | undefined): string {
  return provider?.trim().toLowerCase() || 'local';
}

function readScopeParam(url: URL, key: keyof SearchScope): string | undefined {
  return url.searchParams.get(key)?.trim() || undefined;
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(50, Math.max(1, Math.floor(value)));
}
