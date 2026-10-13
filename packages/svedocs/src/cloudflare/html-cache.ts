import type { Handle } from '@sveltejs/kit/hooks';
import type { RequestEvent } from '@sveltejs/kit';
import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { isAgentRequest } from '../agent/negotiate.js';
import { cacheable, lifetime, readBounded, replay, type CachedHtml } from './html-cache-response.js';
import { readEdgeHtml, writeEdgeHtml } from './html-edge-cache.js';

export interface SvedocsHtmlCacheOptions {
  config: SvedocsResolvedConfig;
  pages: readonly SvedocsPage[];
  /** Explicitly select public pages whose HTML does not depend on the request. */
  include(page: SvedocsPage, event: RequestEvent): boolean;
  /** Disable in development and while prerendering. Static/SPA modes always bypass. */
  enabled?: boolean;
  /** Entry lifetime in seconds. Defaults to 60. */
  maxAge?: number;
  /** Total cached UTF-8 body bytes per handle/isolate. Defaults to 8 MiB. */
  maxBytes?: number;
  /** Largest cacheable response in UTF-8 bytes. Defaults to 512 KiB. */
  maxEntryBytes?: number;
  /** Maximum cached pages per handle/isolate. Defaults to 128. */
  maxEntries?: number;
  /** Opt in to Cloudflare Cache API reuse across isolates. Change version on EVERY deployment. */
  edgeCache?: { version: string };
  /** Cloudflare 8+: pass waitUntil from cloudflare:workers for background writes. */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/** Opt-in, deployment-local SSR reuse. No Response, request or user state is shared. */
export function createSvedocsHtmlCacheHandle(options: SvedocsHtmlCacheOptions): Handle {
  const pages = new Map(options.pages.map((page) => [page.routePath, page]));
  const entries = new Map<string, CachedHtml>();
  const pending = new Map<string, Promise<void>>();
  const maxAge = positive(options.maxAge, 60) * 1000;
  const maxBytes = positive(options.maxBytes, 8 * 1024 * 1024);
  const maxEntryBytes = Math.min(positive(options.maxEntryBytes, 512 * 1024), maxBytes);
  const maxEntries = positive(options.maxEntries, 128);
  if (options.edgeCache && !options.edgeCache.version.trim()) throw new Error('HTML edge cache requires a deployment version.');
  let bytes = 0;

  function remove(key: string) {
    const entry = entries.get(key);
    if (entry) bytes -= entry.body.byteLength;
    entries.delete(key);
  }

  function get(key: string) {
    const entry = entries.get(key);
    if (!entry) return;
    if (entry.expires <= Date.now()) { remove(key); return; }
    entries.delete(key);
    entries.set(key, entry);
    return entry;
  }

  function store(key: string, entry: CachedHtml) {
    remove(key);
    while (entries.size && (entries.size >= maxEntries || bytes + entry.body.byteLength > maxBytes)) remove(entries.keys().next().value!);
    entries.set(key, entry);
    bytes += entry.body.byteLength;
  }

  return async ({ event, resolve }) => {
    const { request, url } = event;
    const page = pages.get(url.pathname);
    if (options.enabled === false || options.config.build.mode !== 'edge'
      || !page || event.isDataRequest || !['GET', 'HEAD'].includes(request.method) || url.search
      || request.headers.has('cookie') || request.headers.has('authorization')
      || event.cookies.getAll().length > 0
      || request.headers.has('range') || request.headers.has('if-match') || request.headers.has('if-unmodified-since')
      || /no-cache|no-store|max-age\s*=\s*0/i.test(request.headers.get('cache-control') ?? '')
      || request.headers.get('pragma')?.includes('no-cache')
      || isAgentRequest(request, options.config.agent) || !options.include(page, event)) return resolve(event);

    // Keep origins and negotiated HTML request types isolated.
    const key = JSON.stringify([url.origin, url.pathname, request.headers.get('accept') ?? '']);
    const hit = get(key);
    if (hit) return replay(hit, request);
    const inflight = pending.get(key);
    if (inflight) {
      await inflight;
      const completed = get(key);
      if (completed) return replay(completed, request);
    }

    let done!: () => void;
    const transaction = new Promise<void>((resolve) => { done = resolve; });
    pending.set(key, transaction);
    try {
      if (options.edgeCache) {
        const stored = await readEdgeHtml(event, key, options.edgeCache.version, maxEntryBytes, maxAge);
        if (stored) {
          store(key, stored);
          return replay(stored, request);
        }
      }
      if (request.method === 'HEAD') return resolve(event);
      const response = await resolve(event);
      if (!cacheable(response) || event.cookies.getAll().length > 0) return response;
      // Read the clone with a byte limit; never retain arbitrarily large/streamed pages.
      const body = await readBounded(response.clone(), maxEntryBytes).catch(() => undefined);
      if (body) {
        const entry = { body, headers: [...response.headers], expires: Date.now() + lifetime(response, maxAge) };
        store(key, entry);
        if (options.edgeCache) await writeEdgeHtml(event, key, options.edgeCache.version, entry, options.waitUntil);
      }
      return response;
    } finally {
      if (pending.get(key) === transaction) pending.delete(key);
      done();
    }
  };
}

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0) throw new Error('HTML cache limits must be positive finite numbers.');
  return value;
}
