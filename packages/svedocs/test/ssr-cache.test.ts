import { describe, expect, it, vi } from 'vitest';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { createSvedocsHtmlCacheHandle } from '../src/cloudflare/html-cache';
import { resolveSvedocsConfig } from '../src/core/config';
import { createServerConfigModule } from '../src/vite/config';
import type { SvedocsPage } from '../src/core/types';

const page = { id: 'doc', routePath: '/docs', sourcePath: 'content/docs/index.md' } as SvedocsPage;
const html = (body = '<h1>Docs</h1>', headers = {}) => new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', etag: '"docs-v1"', ...headers } });
const config = resolveSvedocsConfig({});
function event(path = '/docs', init: RequestInit = {}): RequestEvent {
  const request = new Request(`https://example.com${path}`, init);
  return { request, url: new URL(request.url), cookies: { getAll: () => [] } } as unknown as RequestEvent;
}
function run(handle: Handle, resolve: ReturnType<typeof vi.fn>, request = event()) {
  return handle({ event: request, resolve: resolve as Parameters<Handle>[0]['resolve'] });
}
function cache(extra: Partial<Parameters<typeof createSvedocsHtmlCacheHandle>[0]> = {}) {
  return createSvedocsHtmlCacheHandle({ config, pages: [page], include: () => true, ...extra });
}

describe('explicit public SSR HTML cache', () => {
  it('reuses HTML, isolates response objects, and implements conditional GET and HEAD', async () => {
    const resolve = vi.fn(async () => html());
    const handle = cache();
    const first = await run(handle, resolve);
    first.headers.set('x-request-local', 'first');
    expect(await first.text()).toBe('<h1>Docs</h1>');
    const second = await run(handle, resolve);
    expect(second.headers.has('x-request-local')).toBe(false);
    expect(await second.text()).toBe('<h1>Docs</h1>');
    const head = await run(handle, resolve, event('/docs', { method: 'HEAD' }));
    expect(await head.text()).toBe('');
    expect(head.headers.get('etag')).toBe('"docs-v1"');
    const conditional = await run(handle, resolve, event('/docs', { headers: { 'if-none-match': 'W/"docs-v1"' } }));
    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe('');
    expect(resolve).toHaveBeenCalledOnce();
  });

  it('coalesces eligible concurrent misses without replaying uncacheable responses', async () => {
    let done!: () => void;
    const gate = new Promise<void>((resolve) => { done = resolve; });
    const resolve = vi.fn(async () => { await gate; return html(); });
    const handle = cache();
    const first = run(handle, resolve);
    const second = run(handle, resolve);
    done();
    expect(await (await first).text()).toBe(await (await second).text());
    expect(resolve).toHaveBeenCalledOnce();
    const privateResolve = vi.fn(async () => html('private', { 'cache-control': 'private' }));
    const privateHandle = cache();
    await Promise.all([run(privateHandle, privateResolve), run(privateHandle, privateResolve)]);
    expect(privateResolve).toHaveBeenCalledTimes(2);
  });

  it('isolates origins, expires entries and evicts by capacity', async () => {
    let clock = 1000;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock);
    try {
      const resolve = vi.fn(async () => html());
      const handle = cache({ maxAge: 1, maxEntries: 1 });
      await run(handle, resolve);
      const other = event();
      other.url = new URL('https://other.example/docs');
      await run(handle, resolve, other);
      await run(handle, resolve);
      expect(resolve).toHaveBeenCalledTimes(3);
      clock += 1001;
      await run(handle, resolve);
      expect(resolve).toHaveBeenCalledTimes(4);
    } finally { now.mockRestore(); }
  });

  it('bypasses static/SPA builds, disabled caches and excluded pages', async () => {
    for (const extra of [{ config: resolveSvedocsConfig({ build: { mode: 'static' } }) }, { config: resolveSvedocsConfig({ build: { mode: 'spa' } }) }, { enabled: false }, { include: () => false }]) {
      const handle = cache(extra);
      const resolve = vi.fn(async () => html());
      await run(handle, resolve);
      await run(handle, resolve);
      expect(resolve).toHaveBeenCalledTimes(2);
    }
  });

  it('bypasses personalized, query, revalidation, agent and non-page requests even after a hit', async () => {
    const handle = cache();
    const resolve = vi.fn(async () => html());
    await run(handle, resolve);
    for (const request of [
      event('/docs?query=1'), event('/docs/__data.json'), event('/docs', { method: 'POST' }),
      ...[{ cookie: 'session=1' }, { authorization: 'Bearer token' }, { range: 'bytes=0-3' },
        { 'cache-control': 'no-cache' }, { accept: 'text/markdown' }, { 'user-agent': 'GPTBot' }].map((headers) => event('/docs', { headers })),
      { ...event(), cookies: { getAll: () => [{ name: 'new', value: 'cookie' }] } } as unknown as RequestEvent
    ]) {
      const count = resolve.mock.calls.length;
      await run(handle, resolve, request);
      expect(resolve.mock.calls.length).toBe(count + 1);
    }
  });

  it('never stores errors, private responses, cookies, varied content, nonce CSP or oversized bodies', async () => {
    for (const make of [
      () => new Response('Error', { status: 500 }),
      () => html('private', { 'cache-control': 'private' }),
      () => html('private', { 'cache-control': 'no-store' }),
      () => html('cookie', { 'set-cookie': 'session=1' }),
      () => html('varied', { vary: 'accept-language' }),
      () => html('nonce', { 'content-security-policy': "script-src 'nonce-abc'" }),
      () => html('文'.repeat(50))
    ]) {
      const handle = cache({ maxEntryBytes: 100 });
      const resolve = vi.fn(async () => make());
      const first = await run(handle, resolve);
      expect(await first.text()).toBe(await make().text());
      await run(handle, resolve);
      expect(resolve).toHaveBeenCalledTimes(2);
    }
  });

  it('does not cache cookies set during resolution and retries failed renders', async () => {
    const request = event();
    const resolve = vi.fn(async () => {
      request.cookies.getAll = () => [{ name: 'session', value: 'new' }];
      return html();
    });
    const handle = cache();
    await run(handle, resolve, request);
    await run(handle, resolve);
    expect(resolve).toHaveBeenCalledTimes(2);
    const retry = cache();
    const failure = vi.fn().mockRejectedValueOnce(new Error('SSR failed')).mockImplementation(async () => html());
    await expect(run(retry, failure)).rejects.toThrow('SSR failed');
    expect(await (await run(retry, failure)).text()).toContain('Docs');
  });

  it('returns unfinished streams without caching or consuming their original body', async () => {
    const handle = cache();
    const resolve = vi.fn(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('partial')); }
    }), { headers: { 'content-type': 'text/html' } }));
    for (let i = 0; i < 2; i++) {
      const response = await run(handle, resolve);
      const reader = response.body!.getReader();
      expect(new TextDecoder().decode((await reader.read()).value)).toBe('partial');
      await reader.cancel();
    }
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('respects shorter response freshness and starts empty for a new deployment', async () => {
    let clock = 1000;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock);
    try {
      const resolve = vi.fn(async () => html('public', { 'cache-control': 'public, max-age="1"' }));
      const handle = cache({ maxAge: 60 });
      await run(handle, resolve);
      clock += 1001;
      await run(handle, resolve);
      await run(cache(), resolve);
      expect(resolve).toHaveBeenCalledTimes(3);
    } finally { now.mockRestore(); }
  });
});

it('pins the effective build mode in the server config while retaining runtime functions', async () => {
  for (const mode of ['edge', 'static', 'spa'] as const) {
    const source = createServerConfigModule(resolveSvedocsConfig({ build: { mode } }), '/project/svedocs.config.ts');
    const executable = source.split('\n').filter((line) => !line.startsWith('import ')).join('\n').replace('export default ', 'return ');
    const callback = () => 'runtime';
    const result = new Function('userConfigModule', 'loadSvedocsConfig', executable)({ default: { build: { mode: 'edge' }, callback } }, (value: unknown) => value);
    expect(result.build.mode).toBe(mode);
    expect(result.callback).toBe(callback);
  }
});
