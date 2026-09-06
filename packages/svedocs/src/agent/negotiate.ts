import type { Handle } from '@sveltejs/kit';
import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { createDiscoveryResponse } from '../og/response.js';
import { isAgentUserAgent } from './agents.js';
import { createPageMarkdown, markdownContentType, resolvePageMarkdown, type SvedocsMarkdownMap } from './markdown.js';

export interface SvedocsAgentHandleOptions {
  config: SvedocsResolvedConfig;
  pages: readonly SvedocsPage[];
  markdown?: SvedocsMarkdownMap;
}

interface SvedocsAgentCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export function isAgentRequest(request: Request, agent: SvedocsResolvedConfig['agent']): boolean {
  if (!agent.enabled || !agent.negotiation.enabled) return false;
  if (isAgentUserAgent(request.headers.get('user-agent'), agent.negotiation.userAgents)) return true;
  if (!agent.negotiation.accept) return false;
  return prefersMarkdown(request.headers.get('accept'));
}

export function createSvedocsAgentHandle(options: SvedocsAgentHandleOptions): Handle {
  const { config, pages, markdown } = options;
  const cacheVersion = createAgentCacheVersion(pages, markdown, config);
  return async ({ event, resolve }) => {
    if (config.build.mode !== 'edge') return resolve(event);
    if (!config.agent.enabled || !config.agent.negotiation.enabled) return resolve(event);
    const { request } = event;
    if (request.method !== 'GET' && request.method !== 'HEAD') return resolve(event);
    const pathname = decodePathname(event.url.pathname).replace(/\/+$/, '') || '/';
    const resolution = resolvePageMarkdown(config, pages, markdown, pathname);
    if (resolution.status !== 'found') return resolve(event);
    if (!isAgentRequest(request, config.agent)) {
      const response = await resolve(event);
      response.headers.append('vary', 'accept');
      response.headers.append('vary', 'user-agent');
      return response;
    }
    const cache = config.agent.negotiation.cache.enabled ? resolveCloudflareCache(event) : undefined;
    if (cache && request.method === 'GET') {
      const key = createAgentCacheKey(event.url, cacheVersion);
      const cached = await cache.match(key).catch(() => undefined);
      if (cached) {
        const cachedBody = await cached.text();
        return createOutgoingResponse(cachedBody, request);
      }
      const body = createPageMarkdown(config, resolution.page, resolution.source);
      const write = cache.put(key, createStoredResponse(body, config.agent.negotiation.cache.maxAge)).catch(() => undefined);
      const waitUntil = resolveWaitUntil(event);
      if (waitUntil) waitUntil(write);
      else await write;
      return createOutgoingResponse(body, request);
    }
    return createOutgoingResponse(createPageMarkdown(config, resolution.page, resolution.source), request);
  };
}

export function createAgentCacheVersion(
  pages: readonly SvedocsPage[],
  markdown?: SvedocsMarkdownMap,
  config?: SvedocsResolvedConfig
): string {
  let hash = 0x811c9dc5;
  for (const page of pages) {
    const source = markdown?.[page.id] ?? page.markdown ?? '';
    const text = JSON.stringify([page.id, page.routePath, page.title, page.description,
      config?.site.url, config?.agent.llms, source]);
    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
    }
  }
  return (hash >>> 0).toString(16);
}

function createOutgoingResponse(body: string, request: Request): Response {
  const response = createDiscoveryResponse(body, markdownContentType, request);
  // The negotiated markdown must never enter shared caches under the page's
  // real URL — Cloudflare's edge cache ignores Vary on accept/user-agent
  // and would serve it to browsers. Explicit caching lives in the Cache
  // API entry written under a dedicated cache key.
  response.headers.set('cache-control', 'private, max-age=0, must-revalidate');
  response.headers.append('vary', 'accept');
  response.headers.append('vary', 'user-agent');
  return response;
}

function createStoredResponse(body: string, maxAge: number): Response {
  return new Response(body, {
    headers: {
      'cache-control': `public, max-age=${maxAge}`,
      'content-type': markdownContentType
    }
  });
}

function createAgentCacheKey(url: URL, version: string): Request {
  return new Request(`${url.origin}${url.pathname}?__svedocs_agent_md=${version}`);
}

function resolveCloudflareCache(event: { platform?: unknown }): SvedocsAgentCache | undefined {
  const platform = event.platform as { caches?: { default?: SvedocsAgentCache } } | undefined;
  if (platform?.caches?.default) return platform.caches.default;
  return (globalThis as { caches?: { default?: SvedocsAgentCache } }).caches?.default;
}

function resolveWaitUntil(event: { platform?: unknown }): ((promise: Promise<unknown>) => void) | undefined {
  const platform = event.platform as { context?: { waitUntil?: (promise: Promise<unknown>) => void } } | undefined;
  const waitUntil = platform?.context?.waitUntil;
  return waitUntil ? waitUntil.bind(platform?.context) : undefined;
}

function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  let markdownQ = 0;
  let htmlQ = 0;
  for (const part of accept.split(',')) {
    const [type = '', ...params] = part.split(';');
    let q = 1;
    for (const param of params) {
      const match = /^\s*q\s*=\s*([\d.]+)\s*$/.exec(param);
      if (match) q = Number.parseFloat(match[1] ?? '1');
    }
    const mediaType = type.trim().toLowerCase();
    if (mediaType === 'text/markdown') markdownQ = Math.max(markdownQ, q);
    if (mediaType === 'text/html' || mediaType === 'text/*' || mediaType === '*/*') htmlQ = Math.max(htmlQ, q);
  }
  return markdownQ > 0 && markdownQ >= htmlQ;
}
