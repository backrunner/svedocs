import { describe, expect, it } from 'vitest';
import { createSvedocsAgentHandle } from '../src/agent.js';
import { resolveSvedocsConfig } from '../src/core.js';
import type { SvedocsConfig } from '../src/config.js';
import { createFixturePage } from '../src/testing.js';

function createConfig(agent?: SvedocsConfig['agent']) {
  return resolveSvedocsConfig({ site: { name: 'svedocs', url: 'https://docs.example.com' }, ...(agent !== undefined ? { agent } : {}) });
}

describe('createSvedocsAgentHandle Cloudflare cache', () => {
  const pages = [
    createFixturePage({ id: 'theme', routePath: '/docs/theme', title: 'Theme', markdown: 'Theme body.' })
  ];

  function createFakeCache() {
    const store = new Map<string, Response>();
    const calls = { match: 0, put: 0 };
    return {
      store,
      calls,
      cache: {
        async match(request: Request) {
          calls.match += 1;
          return store.get(request.url)?.clone();
        },
        async put(request: Request, response: Response) {
          calls.put += 1;
          store.set(request.url, response);
        }
      }
    };
  }

  function createCacheEvent(cache: unknown, waitUntil?: (promise: Promise<unknown>) => void) {
    return {
      event: {
        request: new Request('https://docs.example.com/docs/theme', { headers: { 'user-agent': 'ClaudeBot/1.0' } }),
        url: new URL('https://docs.example.com/docs/theme'),
        platform: {
          caches: { default: cache },
          ...(waitUntil ? { context: { waitUntil } } : {})
        }
      },
      resolve: () => new Response('<html>page</html>', { headers: { 'content-type': 'text/html' } })
    };
  }

  it('caches negotiated markdown in the Cloudflare cache and serves later hits from it', async () => {
    const { cache, calls, store } = createFakeCache();
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const first = createCacheEvent(cache);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstResponse = await handle(first as any);
    expect(firstResponse.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    // Outgoing responses must stay private so shared edge caches never serve
    // markdown to browsers under the page URL; the TTL lives on the stored entry.
    expect(firstResponse.headers.get('cache-control')).toContain('private');
    expect(calls.match).toBe(1);
    expect(calls.put).toBe(1);
    const [storedKey, storedResponse] = [...store.entries()][0] ?? [];
    expect(storedKey).toContain('__svedocs_agent_md=');
    expect(storedResponse?.headers.get('cache-control')).toContain('max-age=3600');

    const second = createCacheEvent(cache);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const secondResponse = await handle(second as any);
    expect(calls.match).toBe(2);
    expect(calls.put).toBe(1);
    expect(secondResponse.headers.get('cache-control')).toContain('private');
    expect(secondResponse.headers.get('vary')).toContain('user-agent');
    expect(await secondResponse.text()).toContain('Theme body.');
  });

  it('defers the cache write to waitUntil when the platform provides it', async () => {
    const { cache, calls } = createFakeCache();
    const pending: Promise<unknown>[] = [];
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const { event, resolve } = createCacheEvent(cache, (promise) => pending.push(promise));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.status).toBe(200);
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
    expect(calls.put).toBe(1);
  });

  it('accepts the Cloudflare 8 waitUntil callback directly', async () => {
    const { cache, calls } = createFakeCache();
    const pending: Promise<unknown>[] = [];
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages, waitUntil: (task) => pending.push(task) });
    const response = await handle(createCacheEvent(cache) as unknown as Parameters<typeof handle>[0]);
    expect(response.status).toBe(200);
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
    expect(calls.put).toBe(1);
  });

  it('reuses cached ETags for conditional GET and HEAD without decoding markdown', async () => {
    const { cache, store } = createFakeCache();
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const first = await handle(createCacheEvent(cache) as unknown as Parameters<typeof handle>[0]);
    const etag = first.headers.get('etag')!;
    const stored = [...store.values()][0]!;
    cache.match = async () => {
      const response = stored.clone();
      response.text = async () => { throw new Error('Cached markdown must not be decoded again'); };
      return response;
    };
    for (const method of ['GET', 'HEAD']) {
      const input = createCacheEvent(cache);
      input.event.request = new Request(input.event.request, { method, headers: {
        'user-agent': 'ClaudeBot/1.0', ...(method === 'GET' ? { 'if-none-match': etag } : {})
      } });
      const response = await handle(input as unknown as Parameters<typeof handle>[0]);
      expect(response.status).toBe(method === 'GET' ? 304 : 200);
      expect(await response.text()).toBe('');
      expect(response.headers.get('etag')).toBe(etag);
      expect(response.headers.get('cache-control')).toContain('private');
    }
  });

  it('never negotiates markdown for a SvelteKit data request with a normalized page URL', async () => {
    const { cache, calls } = createFakeCache();
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const input = createCacheEvent(cache);
    Object.assign(input.event, { isDataRequest: true });
    input.resolve = () => new Response('{"type":"data"}', { headers: { 'content-type': 'application/json' } });
    const response = await handle(input as unknown as Parameters<typeof handle>[0]);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(calls.match).toBe(0);
  });

  it('does not touch the cache when caching is disabled', async () => {
    const { cache, calls } = createFakeCache();
    const config = createConfig({ negotiation: { cache: false } });
    const handle = createSvedocsAgentHandle({ config, pages });
    const { event, resolve } = createCacheEvent(cache);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(calls.match).toBe(0);
    expect(calls.put).toBe(0);
  });

  it('does not cache browser pass-through responses', async () => {
    const { cache, calls } = createFakeCache();
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const event = {
      request: new Request('https://docs.example.com/docs/theme', { headers: { 'user-agent': 'Mozilla/5.0 Chrome/126.0', accept: 'text/html' } }),
      url: new URL('https://docs.example.com/docs/theme'),
      platform: { caches: { default: cache } }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handle({ event, resolve: () => new Response('<html/>') } as any);
    expect(calls.match).toBe(0);
    expect(calls.put).toBe(0);
  });

  it('versions cache keys by content so deploys invalidate automatically', async () => {
    const { cache, store } = createFakeCache();
    const v1 = createSvedocsAgentHandle({ config: createConfig(), pages });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await v1(createCacheEvent(cache) as any);
    const v2Pages = [createFixturePage({ id: 'theme', routePath: '/docs/theme', title: 'Theme', markdown: 'Updated body.' })];
    const v2 = createSvedocsAgentHandle({ config: createConfig(), pages: v2Pages });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await v2(createCacheEvent(cache) as any);
    expect(store.size).toBe(2);
    expect(new Set([...store.keys()]).size).toBe(2);
    expect(await response.text()).toContain('Updated body.');
  });
});
