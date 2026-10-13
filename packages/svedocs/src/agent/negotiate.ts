import type { Handle } from '@sveltejs/kit/hooks';
import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { createDiscoveryResponse, matchesEtag } from '../og/response.js';
import { normalizeRoutePath } from '../core/utils.js';
import { isDiscoverablePage } from '../core/seo.js';
import { isAgentUserAgent } from './agents.js';
import { createPageMarkdown, markdownContentType, type SvedocsMarkdownMap } from './markdown.js';

export interface SvedocsAgentHandleOptions {
  config: SvedocsResolvedConfig;
  pages: readonly SvedocsPage[];
  markdown?: SvedocsMarkdownMap;
  /** Cloudflare 8+: pass waitUntil from cloudflare:workers for background writes. */
  waitUntil?: (promise: Promise<unknown>) => void;
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
  // This handle owns a deployment snapshot. Index known routes once, and do not
  // hash the entire markdown corpus on isolates that only serve browsers.
  const routes = new Map<string, { page: SvedocsPage; source: string } | undefined>();
  for (const page of pages) {
    const path = normalizeRoutePath(page.routePath);
    if (routes.has(path)) continue;
    const source = markdown?.[page.id] ?? page.markdown;
    routes.set(path, typeof source === 'string' && isDiscoverablePage(page, config) ? { page, source } : undefined);
  }
  const cacheVersions = new Map<SvedocsPage, string>();
  return async ({ event, resolve }) => {
    if (config.build.mode !== 'edge') return resolve(event);
    if (!config.agent.enabled || !config.agent.negotiation.enabled) return resolve(event);
    const { request } = event;
    if (event.isDataRequest || (request.method !== 'GET' && request.method !== 'HEAD')) return resolve(event);
    const pathname = decodePathname(event.url.pathname).replace(/\/+$/, '') || '/';
    const resolution = routes.get(normalizeRoutePath(pathname));
    if (!config.agent.markdown || !resolution) return resolve(event);
    const { page, source } = resolution;
    if (!isAgentRequest(request, config.agent)) {
      const response = await resolve(event);
      response.headers.append('vary', 'accept');
      response.headers.append('vary', 'user-agent');
      return response;
    }
    const cache = config.agent.negotiation.cache.enabled ? resolveCloudflareCache(event) : undefined;
    if (cache) {
      let version = cacheVersions.get(page);
      if (!version) {
        version = createAgentCacheVersion([page], markdown, config);
        cacheVersions.set(page, version);
      }
      const key = createAgentCacheKey(event.url, version);
      const cached = await cache.match(key).catch(() => undefined);
      if (cached?.headers.has('etag')) return createOutgoingResponse(cached, request);
      if (request.method === 'GET') {
        const response = createDiscoveryResponse(createPageMarkdown(config, page, source), markdownContentType);
        const write = cache.put(key, createStoredResponse(response.clone(), config.agent.negotiation.cache.maxAge)).catch(() => undefined);
        const waitUntil = options.waitUntil ?? resolveWaitUntil(event);
        if (waitUntil) waitUntil(write);
        else await write;
        return createOutgoingResponse(response, request);
      }
    }
    return createOutgoingResponse(createDiscoveryResponse(createPageMarkdown(config, page, source), markdownContentType), request);
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

function createOutgoingResponse(stored: Response, request: Request): Response {
  const headers = new Headers(stored.headers);
  const etag = headers.get('etag');
  const unmodified = etag && matchesEtag(request.headers.get('if-none-match'), etag);
  const empty = unmodified || request.method === 'HEAD';
  if (empty) void stored.body?.cancel().catch(() => {});
  if (unmodified) headers.delete('content-length');
  const response = new Response(empty ? null : stored.body, { status: unmodified ? 304 : 200, headers });
  // The negotiated markdown must never enter shared caches under the page's
  // real URL — Cloudflare's edge cache ignores Vary on accept/user-agent
  // and would serve it to browsers. Explicit caching lives in the Cache
  // API entry written under a dedicated cache key.
  response.headers.set('cache-control', 'private, max-age=0, must-revalidate');
  response.headers.append('vary', 'accept');
  response.headers.append('vary', 'user-agent');
  return response;
}

function createStoredResponse(response: Response, maxAge: number): Response {
  response.headers.set('cache-control', `public, max-age=${maxAge}`);
  return response;
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
