import { describe, expect, it, vi } from 'vitest';
import type { Handle } from '@sveltejs/kit/hooks';
import type { RequestEvent } from '@sveltejs/kit';
import { createSvedocsHtmlCacheHandle } from '../src/cloudflare/html-cache';
import { resolveSvedocsConfig } from '../src/core/config';
import type { SvedocsPage } from '../src/core/types';

const page = { id: 'docs', routePath: '/docs', sourcePath: 'docs.md' } as SvedocsPage;
const config = resolveSvedocsConfig({});
const html = (body = '<h1>Docs</h1>', headers = {}) => new Response(body, {
  headers: { 'content-type': 'text/html', etag: '"v1"', ...headers }
});

function fixture() {
  const entries = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (key: Request) => entries.get(key.url)?.clone()),
    put: vi.fn(async (key: Request, value: Response) => { entries.set(key.url, value.clone()); })
  };
  const open = vi.fn(async () => cache);
  const event = (init: RequestInit = {}, origin = 'https://example.com') => {
    const request = new Request(`${origin}/docs`, init);
    return { request, url: new URL(request.url), cookies: { getAll: () => [] }, platform: { caches: { open } } } as unknown as RequestEvent;
  };
  const handle = (version = 'build-1', extra = {}) => createSvedocsHtmlCacheHandle({
    config, pages: [page], include: () => true, edgeCache: { version }, maxAge: 60, ...extra
  });
  const render = vi.fn(async () => html());
  const run = (hook: Handle, request = event(), resolve = render) => hook({ event: request, resolve: resolve as Parameters<Handle>[0]['resolve'] });
  return { entries, cache, open, event, handle, render, run };
}

describe('Cloudflare public HTML cache', () => {
  it('reuses a bounded snapshot across isolates, then serves memory hits without cache I/O', async () => {
    const f = fixture();
    const first = await f.run(f.handle());
    const secondHandle = f.handle();
    const second = await f.run(secondHandle);
    second.headers.set('x-local', 'second');
    const third = await f.run(secondHandle);
    expect(await second.text()).toBe(await first.text());
    expect(await third.text()).toBe('<h1>Docs</h1>');
    expect(third.headers.has('x-local')).toBe(false);
    expect(third.headers.has('x-svedocs-html-cache')).toBe(false);
    expect(third.headers.has('cache-control')).toBe(false);
    expect(f.render).toHaveBeenCalledOnce();
    expect(f.cache.match).toHaveBeenCalledTimes(2);
    expect(f.open).toHaveBeenCalledWith('svedocs-html-v1');
  });

  it('isolates deployments, origins and Accept variants', async () => {
    const f = fixture();
    await f.run(f.handle());
    await f.run(f.handle('build-2'));
    await f.run(f.handle(), f.event({}, 'https://other.example'));
    await f.run(f.handle(), f.event({ headers: { accept: 'text/html' } }));
    expect(f.render).toHaveBeenCalledTimes(4);
    expect(f.entries.size).toBe(4);
    expect(() => f.handle(' ')).toThrow('deployment version');
  });

  it('handles conditional GET and HEAD from another isolate without rendering', async () => {
    const f = fixture();
    await f.run(f.handle());
    const conditional = await f.run(f.handle(), f.event({ headers: { 'if-none-match': 'W/"v1"' } }));
    const head = await f.run(f.handle(), f.event({ method: 'HEAD' }));
    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe('');
    expect(await head.text()).toBe('');
    expect(head.headers.get('etag')).toBe('"v1"');
    expect(f.render).toHaveBeenCalledOnce();
  });

  it('preserves response policy and expiry when promoting a shared hit into memory', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const f = fixture();
      f.render.mockImplementation(async () => html('Docs', { 'cache-control': 'public, max-age=2' }));
      await f.run(f.handle());
      now.mockReturnValue(2500);
      const second = f.handle();
      expect((await f.run(second)).headers.get('cache-control')).toBe('public, max-age=2');
      now.mockReturnValue(3001);
      await f.run(second);
      expect(f.render).toHaveBeenCalledTimes(2);
    } finally { now.mockRestore(); }
  });

  it('bypasses data, personalized and revalidation requests before either cache', async () => {
    const f = fixture();
    const handle = f.handle();
    await f.run(handle);
    for (const request of [
      { ...f.event(), isDataRequest: true },
      ...[{ cookie: 'session=1' }, { authorization: 'Bearer x' }, { 'cache-control': 'no-cache' },
        { accept: 'text/markdown' }, { range: 'bytes=0-1' }].map((headers) => f.event({ headers }))
    ]) await f.run(handle, request);
    expect(f.cache.match).toHaveBeenCalledOnce();
    expect(f.render).toHaveBeenCalledTimes(7);
  });

  it('never writes uncacheable or oversized responses to the shared cache', async () => {
    for (const response of [
      html('private', { 'cache-control': 'private' }), html('cookie', { 'set-cookie': 'session=1' }),
      html('vary', { vary: 'accept-language' }), html('文'.repeat(100)), new Response('error', { status: 500 })
    ]) {
      const f = fixture();
      f.render.mockImplementation(async () => response.clone());
      await f.run(f.handle('v1', { maxEntryBytes: 100 }));
      expect(f.cache.put).not.toHaveBeenCalled();
    }
  });

  it('falls back on cache failures and rejects shared entries beyond local limits', async () => {
    const f = fixture();
    f.cache.match.mockRejectedValueOnce(new Error('cache unavailable'));
    f.cache.put.mockRejectedValueOnce(new Error('write unavailable'));
    expect(await (await f.run(f.handle())).text()).toContain('Docs');
    await f.run(f.handle());
    await f.run(f.handle('build-1', { maxEntryBytes: 5 }));
    expect(f.render).toHaveBeenCalledTimes(3);
  });

  it('uses the explicit Cloudflare 8 waitUntil callback without a platform context', async () => {
    const f = fixture();
    const tasks: Promise<unknown>[] = [];
    const handle = f.handle('build-1', { waitUntil: (task: Promise<unknown>) => tasks.push(task) });
    expect(await (await f.run(handle)).text()).toContain('Docs');
    expect(tasks).toHaveLength(1);
    await Promise.all(tasks);
    expect(f.cache.put).toHaveBeenCalledOnce();
  });

  it('defers writes with waitUntil and tolerates write failures after responding', async () => {
    const f = fixture();
    const tasks: Promise<unknown>[] = [];
    const event = f.event();
    Object.assign(event.platform!, { context: { waitUntil: (task: Promise<unknown>) => tasks.push(task) } });
    f.cache.put.mockRejectedValueOnce(new Error('cache unavailable'));
    expect(await (await f.run(f.handle(), event)).text()).toContain('Docs');
    expect(tasks).toHaveLength(1);
    await expect(Promise.all(tasks)).resolves.toEqual([undefined]);
  });
});
