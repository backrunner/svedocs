import { expect, test } from '@playwright/test';

test('cached public pages match SSR and keep agent and data responses separate', async ({ request }) => {
  test.skip(['static', 'spa'].includes(process.env.SVEDOCS_BUILD_MODE ?? 'edge'), 'Edge hooks only');
  const headers = { accept: 'text/html', 'user-agent': 'Mozilla/5.0' };
  for (const path of ['/', '/zh', '/docs/configuration', '/docs/zh/configuration']) {
    const fresh = await request.get(path, { headers: { ...headers, 'cache-control': 'no-cache' } });
    expect(fresh.status()).toBe(200);
    const expected = await fresh.text();
    for (let i = 0; i < 2; i++) {
      const cached = await request.get(path, { headers });
      expect(await cached.text()).toBe(expected);
      expect(cached.headers()['x-svedocs-html-cache']).toBeUndefined();
    }
    const head = await request.head(path, { headers });
    expect(head.status()).toBe(200);
    expect(await head.body()).toHaveLength(0);
    // CDN HTML transformations may remove ETags. Keep exact validator coverage
    // mandatory locally, and verify wildcard revalidation through the live CDN.
    const etag = fresh.headers().etag;
    if (!process.env.SVEDOCS_E2E_CDN) expect(etag).toBeTruthy();
    const conditional = await request.get(path, { headers: { ...headers, 'if-none-match': etag ?? '*' } });
    expect(conditional.status()).toBe(304);
    const data = await request.get(`${path === '/' ? '' : path}/__data.json`, { headers });
    expect(data.headers()['content-type']).toContain('application/json');
    expect((await data.json()).type).toBe('data');
    const markdown = await request.get(path, { headers: { ...headers, accept: 'text/markdown' } });
    expect(markdown.headers()['content-type']).toContain('text/markdown');
    expect(markdown.headers()['cache-control']).toContain('private');
    expect(await markdown.text()).toContain('Source:');
    expect(await (await request.get(path, { headers })).text()).toBe(expected);
  }
});
