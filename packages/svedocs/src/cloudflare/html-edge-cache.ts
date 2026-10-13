import type { RequestEvent } from '@sveltejs/kit';
import { cacheable, readBounded, type CachedHtml } from './html-cache-response.js';

interface HtmlCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

const metadataHeader = 'x-svedocs-html-cache';

async function cacheFor(event: RequestEvent): Promise<HtmlCache | undefined> {
  const platform = event.platform as { caches?: CacheStorage } | undefined;
  const storage = platform?.caches ?? (globalThis as { caches?: CacheStorage }).caches;
  // A named cache keeps private storage headers away from the adapter's default cache.
  return storage?.open('svedocs-html-v1');
}

function cacheKey(event: RequestEvent, key: string, version: string): Request {
  const url = new URL('/__svedocs_html_cache__', event.url);
  url.searchParams.set('version', version);
  url.searchParams.set('page', key);
  return new Request(url);
}

export async function readEdgeHtml(
  event: RequestEvent, key: string, version: string, maxBytes: number, maxAge: number
): Promise<CachedHtml | undefined> {
  try {
    const cache = await cacheFor(event);
    const response = await cache?.match(cacheKey(event, key, version));
    if (!response) return;
    const metadata = JSON.parse(response.headers.get(metadataHeader) ?? 'null') as { expires: number; control: string | null } | null;
    if (!metadata || !Number.isFinite(metadata.expires) || metadata.expires <= Date.now()) return;
    const headers = new Headers(response.headers);
    headers.delete(metadataHeader);
    headers.delete('age');
    if (metadata.control === null) headers.delete('cache-control');
    else headers.set('cache-control', metadata.control);
    if (!cacheable(new Response(null, { status: response.status, headers }))) return;
    const body = await readBounded(response, maxBytes);
    if (body) return { body, headers: [...headers], expires: Math.min(metadata.expires, Date.now() + maxAge) };
  } catch { /* Cache errors must never prevent SSR. */ }
}

export async function writeEdgeHtml(event: RequestEvent, key: string, version: string, entry: CachedHtml, waitUntil?: (promise: Promise<unknown>) => void): Promise<void> {
  const write = async () => {
    const cache = await cacheFor(event);
    if (!cache) return;
    const ttl = Math.floor((entry.expires - Date.now()) / 1000);
    if (ttl <= 0) return;
    const headers = new Headers(entry.headers);
    headers.set(metadataHeader, JSON.stringify({ expires: entry.expires, control: headers.get('cache-control') }));
    headers.set('cache-control', `public, max-age=${ttl}`);
    await cache.put(cacheKey(event, key, version), new Response(entry.body, { headers }));
  };
  const task = write().catch(() => {});
  const platform = event.platform as { context?: { waitUntil(promise: Promise<unknown>): void } } | undefined;
  if (waitUntil) waitUntil(task);
  else if (platform?.context?.waitUntil) platform.context.waitUntil(task);
  else await task;
}
