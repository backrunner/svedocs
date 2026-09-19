import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadSvedocsConfig, validateSvedocsConfig, type SvedocsConfig } from '../src/config.js';
import { createIntegrationAssets, createIndexNowPayloads, submitIndexNow } from '../src/integrations.js';
import { integrationAssets, serveIntegrationAssets } from '../src/vite/integrations.js';
import type { ViteDevServer } from 'vite';
import { trackIntegrationPage } from '../src/integrations/browser.js';
import { createFixturePage } from '../src/testing.js';

const input: SvedocsConfig = {
  site: { url: 'https://example.com' },
  integrations: {
    umami: { websiteId: 'test-website' },
    googleAnalytics: { id: 'G-TEST123' },
    googleAds: { id: 'AW-123456', conversions: { signup: { label: 'signed-up', path: '/thanks', value: 1, currency: 'USD' } } },
    googleAdsense: { client: 'ca-pub-1234567890123456', slots: { footer: { slot: '12345' } }, placements: { articleBottom: 'footer' } },
    indexNow: { key: 'test-indexnow-key' }
  }
};

describe('optional integration configuration', () => {
  it('disables all providers by default and resolves opt-in defaults', () => {
    const defaults = loadSvedocsConfig().integrations;
    expect(defaults).toEqual({ development: false, respectDoNotTrack: true, umami: false, googleAnalytics: false, googleAds: false, googleAdsense: false, indexNow: false });
    expect(loadSvedocsConfig({ integrations: false }).integrations).toEqual(defaults);
    expect(createIntegrationAssets(loadSvedocsConfig())).toEqual({});
    expect(loadSvedocsConfig(input).integrations).toMatchObject({
      umami: { src: 'https://cloud.umami.is/script.js', domains: [] },
      googleAdsense: { autoAds: false, adsTxt: true },
      indexNow: { endpoint: 'https://api.indexnow.org/indexnow' }
    });
  });

  it.each([
    { umami: { websiteId: '' } },
    { umami: { websiteId: 'test', src: 'javascript:alert(1)' } },
    { googleAnalytics: { id: 'UA-123456' } },
    { googleAds: { id: 'G-TEST' } },
    { googleAds: { id: 'AW-123', conversions: { test: { label: 'test', value: 1 } } } },
    { googleAdsense: { client: 'ca-pub-1234567890123456', placements: { articleTop: 'missing' } } },
    { indexNow: { key: '../secret' } },
    { indexNow: { key: 'test-indexnow-key', endpoint: 'http://api.indexnow.org/indexnow' } },
    { googleAnaltyics: { id: 'G-TEST' } }
  ])('rejects malformed integration settings %j', (integrations) => {
    expect(() => validateSvedocsConfig({ ...input, integrations } as SvedocsConfig)).toThrow();
  });

  it('requires a public site URL for IndexNow', () => {
    expect(() => loadSvedocsConfig({ integrations: { indexNow: { key: 'test-indexnow-key' } } })).toThrow('site.url');
  });

  it('does not touch provider scripts during SSR, with defaults, or in development', () => {
    expect(() => trackIntegrationPage(loadSvedocsConfig(input).integrations, 'SSR')).not.toThrow();
    const createElement = vi.fn(() => { throw new Error('Unexpected script injection'); });
    vi.stubGlobal('window', { location: { href: 'https://example.com/docs' } });
    vi.stubGlobal('document', { createElement });
    vi.stubGlobal('navigator', { doNotTrack: '0' });
    try {
      trackIntegrationPage(loadSvedocsConfig().integrations, 'Defaults');
      trackIntegrationPage(loadSvedocsConfig(input).integrations, 'Development', true);
      expect(createElement).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});

describe('generated integration files', () => {
  it('generates a verification file and standard AdSense ads.txt', () => {
    expect(createIntegrationAssets(loadSvedocsConfig(input))).toEqual({
      'test-indexnow-key.txt': 'test-indexnow-key',
      'ads.txt': 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n'
    });
  });

  it('preserves a user-owned ads.txt and rejects conflicting verification files', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'svedocs-integration-assets-'));
    try {
      await writeFile(path.join(dir, 'ads.txt'), 'other seller');
      expect(await integrationAssets(loadSvedocsConfig(input), dir)).toEqual({ 'test-indexnow-key.txt': 'test-indexnow-key' });
      await writeFile(path.join(dir, 'test-indexnow-key.txt'), 'wrong key');
      await expect(integrationAssets(loadSvedocsConfig(input), dir)).rejects.toThrow('Conflicting IndexNow');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('limits development file checks to the requested integration asset', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'svedocs-integration-middleware-'));
    const use = vi.fn();
    try {
      await writeFile(path.join(dir, 'test-indexnow-key.txt'), 'wrong key');
      serveIntegrationAssets({ middlewares: { use } } as unknown as ViteDevServer, () => loadSvedocsConfig(input), dir);
      const middleware = use.mock.calls[0]![0];
      const next = vi.fn();
      const response = { setHeader: vi.fn(), end: vi.fn() };
      await middleware({ method: 'GET', url: '/docs' }, response, next);
      expect(next).toHaveBeenCalledWith();
      expect(response.end).not.toHaveBeenCalled();
      next.mockClear();
      await middleware({ method: 'GET', url: '/ads.txt' }, response, next);
      expect(response.end).toHaveBeenCalledWith(expect.stringContaining('pub-1234567890123456'));
      expect(next).not.toHaveBeenCalled();
      await middleware({ method: 'GET', url: '/test-indexnow-key.txt' }, response, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Conflicting IndexNow') }));
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});

describe('IndexNow submission', () => {
  it('filters hidden, noindex and foreign URLs, deduplicates canonicals and respects static paths', () => {
    const config = loadSvedocsConfig({ ...input, build: { mode: 'static' } });
    const pages = [
      createFixturePage({ routePath: '/docs' }),
      createFixturePage({ routePath: '/docs/zh' }),
      createFixturePage({ routePath: '/hidden', hidden: true }),
      createFixturePage({ routePath: '/noindex', seo: { title: 'No index', robots: 'noindex,follow' } }),
      createFixturePage({ routePath: '/external', seo: { title: 'Other', canonical: 'https://elsewhere.com/docs' } }),
      createFixturePage({ routePath: '/duplicate', seo: { title: 'Alias', canonical: 'https://example.com/docs/' } })
    ];
    expect(createIndexNowPayloads(config, pages)).toEqual([{
      host: 'example.com', key: 'test-indexnow-key', keyLocation: 'https://example.com/test-indexnow-key.txt',
      urlList: ['https://example.com/docs/', 'https://example.com/docs/zh/']
    }]);
    config.seo.head.meta.push({ name: 'robots', content: 'noindex' });
    expect(createIndexNowPayloads(config, pages)).toEqual([]);
  });

  it('splits large sites at the protocol limit', () => {
    const pages = Array.from({ length: 10_001 }, (_, index) => createFixturePage({ routePath: `/docs/${index}` }));
    expect(createIndexNowPayloads(loadSvedocsConfig(input), pages).map((payload) => payload.urlList.length)).toEqual([10_000, 1]);
  });

  it.each([200, 202])('verifies deployment before posting and accepts HTTP %i', async (status) => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('test-indexnow-key'))
      .mockResolvedValueOnce(new Response(null, { status }));
    const result = await submitIndexNow(loadSvedocsConfig(input), [createFixturePage()], { fetch: request });
    expect(request.mock.calls[0]?.[0]).toBe('https://example.com/test-indexnow-key.txt');
    expect(request.mock.calls[1]?.[0]).toBe('https://api.indexnow.org/indexnow');
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body)).urlList).toEqual(['https://example.com/']);
    expect(result).toEqual({ submitted: 1, batches: 1, statuses: [status] });
  });

  it('does not submit before deployment, and surfaces provider failures', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>SPA fallback</html>'));
    await expect(submitIndexNow(loadSvedocsConfig(input), [createFixturePage()], { fetch: request })).rejects.toThrow('Deploy the build');
    expect(request).toHaveBeenCalledTimes(1);
    request.mockResolvedValue(new Response(null, { status: 429 }));
    await expect(submitIndexNow(loadSvedocsConfig(input), [createFixturePage()], { fetch: request, verifyKey: false })).rejects.toThrow('HTTP 429');
  });
});
