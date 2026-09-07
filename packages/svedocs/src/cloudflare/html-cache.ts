import type { Handle, RequestEvent } from '@sveltejs/kit';
import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { isAgentRequest } from '../agent/negotiate.js';

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
}

interface CachedHtml {
  body: Uint8Array<ArrayBuffer>;
  headers: [string, string][];
  expires: number;
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

  return async ({ event, resolve }) => {
    const { request, url } = event;
    const page = pages.get(url.pathname);
    if (options.enabled === false || options.config.build.mode !== 'edge'
      || !page || !['GET', 'HEAD'].includes(request.method) || url.search
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
    if (request.method === 'HEAD') return resolve(event);

    let done!: () => void;
    const transaction = new Promise<void>((resolve) => { done = resolve; });
    pending.set(key, transaction);
    try {
      const response = await resolve(event);
      if (!cacheable(response) || event.cookies.getAll().length > 0) return response;
      // Read the clone with a byte limit; never retain arbitrarily large/streamed pages.
      const body = await readBounded(response.clone(), maxEntryBytes).catch(() => undefined);
      if (body) {
        remove(key);
        while (entries.size && (entries.size >= maxEntries || bytes + body.byteLength > maxBytes)) remove(entries.keys().next().value!);
        entries.set(key, { body, headers: [...response.headers], expires: Date.now() + lifetime(response, maxAge) });
        bytes += body.byteLength;
      }
      return response;
    } finally {
      if (pending.get(key) === transaction) pending.delete(key);
      done();
    }
  };
}

function cacheable(response: Response): boolean {
  return response.status === 200 && /^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')
    && !response.headers.has('set-cookie') && !response.headers.has('vary')
    && !response.headers.has('content-encoding') && !response.headers.has('content-range')
    && !/private|no-store|no-cache|max-age\s*=\s*"?0(?:\D|$)/i.test(response.headers.get('cache-control') ?? '')
    && !/\bnonce-/i.test(response.headers.get('content-security-policy') ?? '');
}

function lifetime(response: Response, maximum: number): number {
  const control = response.headers.get('cache-control') ?? '';
  const age = /\bs-maxage\s*=\s*"?(\d+)/i.exec(control) ?? /\bmax-age\s*=\s*"?(\d+)/i.exec(control);
  return age ? Math.min(maximum, Number(age[1]) * 1000) : maximum;
}

function replay(entry: CachedHtml, request: Request): Response {
  const headers = new Headers(entry.headers);
  const etag = headers.get('etag');
  const matches = request.headers.get('if-none-match')?.split(',').some((value) =>
    value.trim() === '*' || etag && value.trim().replace(/^W\//, '') === etag.replace(/^W\//, ''));
  if (matches) {
    headers.delete('content-length');
    return new Response(null, { status: 304, headers });
  }
  return new Response(request.method === 'HEAD' ? null : entry.body.slice(), { headers });
}

async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    void response.body?.cancel().catch(() => {});
    return;
  }
  const reader = response.body?.getReader();
  if (!reader) return;
  // Streaming/custom SSR must not hold up a request indefinitely while filling a cache.
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 100);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { void reader.cancel().catch(() => {}); return; }
      chunks.push(value);
    }
    if (timedOut) return;
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return body;
  } finally { clearTimeout(timer); reader.releaseLock(); }
}

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0) throw new Error('HTML cache limits must be positive finite numbers.');
  return value;
}
