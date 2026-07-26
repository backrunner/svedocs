import type { SvedocsSearchRecord } from '../core.js';

export interface SearchQuery {
  query: string;
  limit?: number;
  locale?: string;
  kind?: string;
  signal?: AbortSignal;
}

export interface SearchScope {
  locale?: string;
  kind?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  score: number;
  section?: string;
  metadata: SvedocsSearchRecord['metadata'];
}

export interface SearchProvider {
  name: string;
  index(records: SvedocsSearchRecord[]): Promise<void> | void;
  search(query: SearchQuery): Promise<SearchResult[]> | SearchResult[];
}

export interface CloudflareAiSearchSyncDocument {
  id: string;
  title: string;
  url: string;
  content: string;
  metadata: Record<string, string>;
}

export interface CloudflareAiSearchSyncOptions {
  records: SvedocsSearchRecord[];
  accountId?: string;
  apiToken?: string;
  instanceName: string;
  namespace?: string;
  endpoint?: string;
  dryRun?: boolean;
  waitForCompletion?: boolean;
  strategy?: 'append' | 'replace';
  deleteIds?: string[];
  existingIds?: string[];
  batchSize?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetch?: typeof fetch;
}

export interface CloudflareAiSearchSyncResult {
  provider: 'cloudflare-ai-search';
  instanceName: string;
  endpoint: string;
  dryRun: boolean;
  indexed: number;
  deleted: number;
  failed: number;
  planned: {
    uploadIds: string[];
    deleteIds: string[];
  };
  errors: Array<{
    id: string;
    message: string;
  }>;
}

export interface CloudflareAiSearchInstance {
  search(input: CloudflareAiSearchInput): Promise<CloudflareAiSearchOutput>;
  chatCompletions?(input: CloudflareAiSearchChatInput): Promise<CloudflareAiSearchChatOutput | ReadableStream<Uint8Array> | Response>;
  items?: CloudflareAiSearchItemsBinding;
}

export interface CloudflareAiSearchItemsBinding {
  upload(input: File | Blob | ArrayBuffer | string, options?: CloudflareAiSearchItemUploadOptions): Promise<unknown>;
  uploadAndPoll?(input: File | Blob | ArrayBuffer | string, options?: CloudflareAiSearchItemUploadOptions): Promise<unknown>;
  delete?(itemId: string): Promise<unknown>;
  get?(itemId: string): Promise<unknown>;
  list?(options?: { limit?: number; cursor?: string }): Promise<unknown>;
}

export interface CloudflareAiSearchItemUploadOptions {
  id?: string;
  metadata?: Record<string, string>;
  contentType?: string;
  filename?: string;
}

export interface CloudflareAiSearchMessage {
  role: 'system' | 'developer' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface CloudflareAiSearchInput {
  query?: string;
  messages?: CloudflareAiSearchMessage[];
  ai_search_options?: {
    instance_ids?: string[];
    query_rewrite?: boolean | {
      enabled?: boolean;
      model?: string;
    };
    retrieval?: {
      retrieval_type?: 'vector' | 'keyword' | 'hybrid';
      match_threshold?: number;
      max_num_results?: number;
      filters?: Record<string, unknown>;
      context_expansion?: number;
      fusion_method?: 'rrf' | 'max';
      keyword_match_mode?: string;
      reranking?: {
        enabled?: boolean;
        model?: string;
      };
    };
  };
  max_num_results?: number;
}

export interface CloudflareAiSearchItem {
  id?: string;
  title?: string;
  url?: string;
  content?: string;
  text?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface CloudflareAiSearchChunk {
  id?: string;
  type?: string;
  text?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  item?: {
    id?: string;
    key?: string;
    filename?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface CloudflareAiSearchOutput {
  response?: string;
  answer?: string;
  data?: CloudflareAiSearchItem[];
  chunks?: CloudflareAiSearchChunk[];
}

export interface CloudflareAiSearchChatInput {
  messages: CloudflareAiSearchMessage[];
  ai_search_options?: CloudflareAiSearchInput['ai_search_options'];
  model?: string;
  stream?: boolean;
}

export interface CloudflareAiSearchChatOutput extends CloudflareAiSearchOutput {
  choices?: Array<{
    text?: string;
    message?: {
      content?: string;
    };
  }>;
  citations?: Array<{
    title?: string;
    url?: string;
    section?: string;
  }>;
}

export interface CloudflareAiSearchNamespace {
  get(instanceName: string): CloudflareAiSearchInstance;
  search?(input: CloudflareAiSearchInput): Promise<CloudflareAiSearchOutput>;
  chatCompletions?(input: CloudflareAiSearchChatInput): Promise<CloudflareAiSearchChatOutput | ReadableStream<Uint8Array> | Response>;
}
