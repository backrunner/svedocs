import type { SvedocsResolvedConfig, SvedocsSearchRecord } from '../core.js';
import type { CloudflareAiSearchInstance, CloudflareAiSearchNamespace } from '../search.js';
import { createCloudflareAiSearchAiProvider, createMockAiProvider, createWorkersAiProvider } from './providers.js';
import { createAskResponse } from './response.js';
import type { AiProvider, CloudflareWorkersAiBinding, CreateAskResponseOptions } from './types.js';
import { createOpenAiCompatibleProvider } from './openai-compatible.js';

export interface SvedocsAiRuntimeEnv {
  SVEDOCS_AI_SEARCH?: CloudflareAiSearchInstance | CloudflareAiSearchNamespace | undefined;
  AI?: CloudflareWorkersAiBinding | undefined;
  OPENAI_COMPATIBLE_API_KEY?: string | undefined;
  OPENAI_COMPATIBLE_BASE_URL?: string | undefined;
  OPENAI_COMPATIBLE_MODEL?: string | undefined;
  OPENAI_COMPATIBLE_TEMPERATURE?: string | undefined;
  SVEDOCS_OPENAI_COMPATIBLE_API_KEY?: string | undefined;
  SVEDOCS_OPENAI_COMPATIBLE_BASE_URL?: string | undefined;
  SVEDOCS_OPENAI_COMPATIBLE_MODEL?: string | undefined;
  SVEDOCS_OPENAI_COMPATIBLE_TEMPERATURE?: string | undefined;
  [key: string]: unknown;
}

export interface CreateConfiguredAiProviderOptions {
  config: Pick<SvedocsResolvedConfig, 'ai' | 'cloudflare'>;
  env?: SvedocsAiRuntimeEnv;
  provider?: string;
  systemPrompt?: string;
  maxResults?: number;
  fetch?: typeof fetch;
}

export interface CreateConfiguredAskResponseOptions extends Omit<CreateAskResponseOptions, 'records'> {
  env?: SvedocsAiRuntimeEnv;
  provider?: string;
  fetch?: typeof fetch;
}

export function createConfiguredAiProvider(options: CreateConfiguredAiProviderOptions): AiProvider {
  const provider = normalizeProviderName(options.provider ?? options.config.ai.provider);
  if (!options.config.ai.enabled) return createMockAiProvider();
  const systemPrompt = options.systemPrompt ?? options.config.ai.systemPrompt;
  const maxResults = options.maxResults ?? options.config.ai.maxResults;
  if (provider === 'cloudflare-workers-ai') {
    const ai = readWorkersAiBinding(options.env);
    if (ai) return createWorkersAiProvider({
      ai,
      ...(systemPrompt ? { systemPrompt } : {}),
      ...(typeof maxResults === 'number' ? { citationLimit: maxResults } : {})
    });
    return createMockAiProvider();
  }
  if (provider === 'cloudflare-ai-search') {
    const binding = readCloudflareAiSearchBinding(options.env, options.config);
    if (binding) {
      return createCloudflareAiSearchAiProvider({
        binding,
        instanceName: options.config.cloudflare.aiSearch.instanceName,
        namespace: Boolean(options.config.cloudflare.aiSearch.namespace),
        ...(systemPrompt ? { systemPrompt } : {}),
        ...(typeof maxResults === 'number' ? { maxResults } : {})
      });
    }
    return createMockAiProvider();
  }
  if (provider === 'openai-compatible') {
    const apiKey = readFirstEnv(options.env, ['SVEDOCS_OPENAI_COMPATIBLE_API_KEY', 'OPENAI_COMPATIBLE_API_KEY']);
    const baseUrl = readFirstEnv(options.env, ['SVEDOCS_OPENAI_COMPATIBLE_BASE_URL', 'OPENAI_COMPATIBLE_BASE_URL']);
    const model = readFirstEnv(options.env, ['SVEDOCS_OPENAI_COMPATIBLE_MODEL', 'OPENAI_COMPATIBLE_MODEL']);
    const temperature = readNumberEnv(options.env, ['SVEDOCS_OPENAI_COMPATIBLE_TEMPERATURE', 'OPENAI_COMPATIBLE_TEMPERATURE']);
    if (apiKey && model) {
      return createOpenAiCompatibleProvider({
        apiKey,
        model,
        ...(baseUrl ? { baseUrl } : {}),
        ...(typeof temperature === 'number' ? { temperature } : {}),
        ...(systemPrompt ? { systemPrompt } : {}),
        ...(typeof maxResults === 'number' ? { citationLimit: maxResults } : {}),
        ...(options.fetch ? { fetch: options.fetch } : {})
      });
    }
    return createMockAiProvider();
  }
  return createMockAiProvider();
}

export function createConfiguredAskResponse(
  config: Pick<SvedocsResolvedConfig, 'ai' | 'cloudflare'>,
  records: SvedocsSearchRecord[],
  request: Request,
  options: CreateConfiguredAskResponseOptions = {}
): Promise<Response> {
  const provider = createConfiguredAiProvider({
    config,
    ...(options.provider ? { provider: options.provider } : {}),
    ...(options.systemPrompt ? { systemPrompt: options.systemPrompt } : {}),
    ...(typeof options.maxResults === 'number' ? { maxResults: options.maxResults } : {}),
    ...(options.env ? { env: options.env } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {})
  });
  return createAskResponse(provider, request, {
    records,
    ...(typeof options.stream === 'boolean' ? { stream: options.stream } : {}),
    ...(options.scope ? { scope: options.scope } : {}),
    ...(options.rateLimiter ? { rateLimiter: options.rateLimiter } : {}),
    ...(options.rateLimitKey ? { rateLimitKey: options.rateLimitKey } : {}),
    ...(options.systemPrompt ? { systemPrompt: options.systemPrompt } : {}),
    ...(typeof options.maxResults === 'number' ? { maxResults: options.maxResults } : {})
  });
}

function readCloudflareAiSearchBinding(
  env: SvedocsAiRuntimeEnv | undefined,
  config: Pick<SvedocsResolvedConfig, 'cloudflare'>
): CloudflareAiSearchInstance | CloudflareAiSearchNamespace | undefined {
  const bindingName = config.cloudflare.aiSearch.binding;
  const dynamicBinding = env?.[bindingName];
  if (isCloudflareAiSearchBinding(dynamicBinding)) return dynamicBinding;
  if (isCloudflareAiSearchBinding(env?.SVEDOCS_AI_SEARCH)) return env.SVEDOCS_AI_SEARCH;
  return undefined;
}

function readWorkersAiBinding(env: SvedocsAiRuntimeEnv | undefined): CloudflareWorkersAiBinding | undefined {
  return isWorkersAiBinding(env?.AI) ? env.AI : undefined;
}

function isCloudflareAiSearchBinding(
  value: unknown
): value is CloudflareAiSearchInstance | CloudflareAiSearchNamespace {
  if (!value || typeof value !== 'object') return false;
  return 'search' in value || 'get' in value;
}

function isWorkersAiBinding(value: unknown): value is CloudflareWorkersAiBinding {
  if (!value || typeof value !== 'object') return false;
  return 'run' in value && typeof (value as { run?: unknown }).run === 'function';
}

function readFirstEnv(env: SvedocsAiRuntimeEnv | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumberEnv(env: SvedocsAiRuntimeEnv | undefined, keys: string[]): number | undefined {
  const value = readFirstEnv(env, keys);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeProviderName(provider: string | undefined): string {
  return provider?.trim().toLowerCase() || 'mock';
}
