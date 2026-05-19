import type { SvedocsSearchRecord } from '../core.js';
import type {
  CloudflareAiSearchBinding,
  CloudflareAiSearchChatOutput,
  CloudflareAiSearchInput,
  CloudflareAiSearchInstance,
  CloudflareAiSearchNamespace,
  SearchScope
} from '../search.js';

export interface AiProvider {
  name: string;
  ask(input: AskInput): Promise<AskResult> | AskResult;
  stream?(input: AskInput): Promise<Response | ReadableStream<Uint8Array>> | Response | ReadableStream<Uint8Array>;
}

export interface AskCitation {
  title: string;
  url: string;
  section?: string;
}

export interface AskInput {
  question: string;
  context?: string[];
  records?: SvedocsSearchRecord[];
  scope?: SearchScope;
}

export interface AskResult {
  answer: string;
  citations: AskCitation[];
}

export interface AiRateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export interface AiRateLimiter {
  check(input: {
    key: string;
    request: Request;
  }): AiRateLimitResult | Promise<AiRateLimitResult>;
}

export interface AiRateLimitStore {
  get(key: string): Promise<{ count: number; resetAt: number } | undefined>;
  put(key: string, value: { count: number; resetAt: number }, ttlSeconds: number): Promise<void>;
}

export interface CreateAskResponseOptions {
  records?: SvedocsSearchRecord[];
  stream?: boolean;
  scope?: SearchScope | ((request: Request) => SearchScope);
  rateLimiter?: AiRateLimiter;
  rateLimitKey?: string | ((request: Request) => string);
}

export interface CloudflareAiChatInstance extends CloudflareAiSearchInstance {
  chatCompletions?(input: {
    messages: Array<{
      role: 'system' | 'developer' | 'user' | 'assistant' | 'tool';
      content: string;
    }>;
    model?: string;
    stream?: boolean;
    ai_search_options?: CloudflareAiSearchInput['ai_search_options'];
  }): Promise<CloudflareAiSearchChatOutput | Response | ReadableStream<Uint8Array>>;
}

export interface CloudflareWorkersAiBinding {
  run(model: string, input: {
    messages?: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
    prompt?: string;
    stream?: boolean;
  }): Promise<string | {
    response?: string;
    answer?: string;
    result?: string;
  }>;
}

export interface CloudflareKvNamespace {
  get<T = unknown>(key: string, options?: { type?: 'json' }): Promise<T | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export type AiSearchBinding = CloudflareAiChatInstance | CloudflareAiSearchNamespace;
export type AiSearchRuntimeBinding = CloudflareAiChatInstance | CloudflareAiSearchNamespace | CloudflareAiSearchBinding;
