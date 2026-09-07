// Build the official site in edge/static mode before running the matching verification.
import assert from 'node:assert/strict';
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { chromium } from '@playwright/test';
import { loadConfigFromFile } from 'vite';
import { loadSvedocsContent } from '../packages/svedocs/dist/core.js';
import { createSvedocsRouteEntries, resolveSvedocsPageRoute } from '../packages/svedocs/dist/routes.js';
import { createPageMarkdown, createPageMarkdownPath } from '../packages/svedocs/dist/agent.js';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'apps/site');
const output = {};
const round = (n) => Math.round(n * 1000) / 1000;
const summarize = (times) => {
  times.sort((a, b) => a - b);
  return { medianMs: round((times[99] + times[100]) / 2), p95Ms: round(times[189]) };
};
if (process.argv.includes('--ssr')) {
  const { Server } = await import(pathToFileURL(path.join(site, '.svelte-kit/output/server/index.js')));
  const { manifest } = await import(pathToFileURL(path.join(site, '.svelte-kit/output/server/manifest.js')));
  const server = new Server(manifest);
  await server.init({ env: {} });
  const respond = (headers = {}, method = 'GET') => server.respond(new Request('https://svedocs.pwp.sh/docs/configuration', {
    method, headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0', ...headers }
  }), { getClientAddress: () => '127.0.0.1' });
  const first = await respond();
  assert.equal(first.status, 200);
  const expected = await first.text();
  const before = [], after = [];
  for (let i = 0; i < 20; i++) { await (await respond({ 'cache-control': 'no-cache' })).text(); await (await respond()).text(); }
  for (let i = 0; i < 200; i++) {
    let started = performance.now();
    assert.equal(await (await respond({ 'cache-control': 'no-cache' })).text(), expected);
    before.push(performance.now() - started);
    started = performance.now();
    assert.equal(await (await respond()).text(), expected);
    after.push(performance.now() - started);
  }
  const agent = await respond({ accept: 'text/markdown', 'user-agent': 'GPTBot' });
  assert.match(agent.headers.get('content-type'), /text\/markdown/);
  assert.match(agent.headers.get('cache-control'), /private/);
  assert.match(await agent.text(), /# Configuration/);
  assert.equal(await (await respond()).text(), expected);
  const etag = first.headers.get('etag');
  assert(etag);
  assert.equal((await respond({ 'if-none-match': etag })).status, 304);
  assert.equal(await (await respond({}, 'HEAD')).text(), '');
  output.ssr = { uncached: summarize(before), cached: summarize(after), identicalHtml: true, negotiatedMarkdownIsolated: true, samplesPerMode: 200 };
}
if (process.argv.includes('--static')) {
  const { config } = await loadConfigFromFile({ command: 'build', mode: 'production' }, path.join(site, 'svedocs.config.ts'), site, 'silent');
  const content = await loadSvedocsContent({ projectRoot: site, config: { ...config, build: { ...config.build, mode: 'static' } } });
  const build = path.join(site, 'build');
  // Serve only files. There is deliberately no SvelteKit/SSR fallback.
  const http = createServer(async (request, response) => {
    try {
      let file = path.resolve(build, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
      if (file !== build && !file.startsWith(`${build}${path.sep}`)) { response.writeHead(403).end(); return; }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml' };
      response.setHeader('content-type', types[path.extname(file)] ?? 'application/octet-stream');
      response.end(await readFile(file));
    } catch { response.writeHead(404).end('Static file not found'); }
  });
  await new Promise((resolve) => http.listen(0, '::1', resolve));
  const origin = `http://[::1]:${http.address().port}`;
  const browser = await chromium.launch();
  let markdownCount = 0;
  let headingCount = 0;
  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    for (const entry of content.pages) {
      const response = await page.goto(`${origin}${entry.routePath === '/' ? '/' : `${entry.routePath}/`}`);
      assert.equal(response.status(), 200, entry.routePath);
      const title = await page.title();
      assert(title.includes(entry.seo.title), `Missing title: ${entry.routePath}`);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), entry.seo.canonical);
      assert.equal(await page.locator('.sd-render-error').count(), 0, entry.routePath);
      if (entry.kind === 'doc') {
        assert.equal((await page.locator('h1').first().textContent()).trim(), entry.title);
        for (const heading of entry.headings) {
          assert(await page.locator(`[id=${JSON.stringify(heading.id)}]`).count(), `${entry.routePath}#${heading.id}`);
          headingCount++;
        }
      }
      if (!entry.hidden && !entry.seo.robots?.includes('noindex')) {
        const markdown = await readFile(path.join(build, createPageMarkdownPath(entry)), 'utf8');
        assert.equal(markdown, createPageMarkdown(content.config, entry, entry.markdown));
        markdownCount++;
      }
    }
    let redirects = 0;
    for (const route of createSvedocsRouteEntries(content.pages, content.config)) {
      const resolution = resolveSvedocsPageRoute(route, content.pages, content.config);
      if (resolution.status !== 'redirect') continue;
      const body = await readFile(path.join(build, route, 'index.html'), 'utf8');
      assert(body.includes(`location.href=${JSON.stringify(resolution.location)}`), route);
      redirects++;
    }
    // Every local emitted JS/CSS dependency referenced by HTML must exist on disk.
    let assetReferences = 0;
    for (const relative of await readdir(build, { recursive: true })) {
      if (!relative.endsWith('.html')) continue;
      const body = await readFile(path.join(build, relative), 'utf8');
      for (const match of body.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:[?#][^"]*)?"/g)) {
        if (/^(?:[a-z]+:|\/\/)/i.test(match[1])) continue;
        const target = match[1].startsWith('/') ? path.join(build, match[1]) : path.resolve(build, path.dirname(relative), match[1]);
        assert((await stat(target)).isFile(), `${relative}: ${match[1]}`);
        assetReferences++;
      }
    }
    for (const file of ['sitemap.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', 'feed.xml']) assert((await stat(path.join(build, file))).size > 0, file);
    const missing = await page.goto(`${origin}/docs/does-not-exist/`);
    assert.equal(missing.status(), 404);
    output.static = { pages: content.pages.length, markdownTwins: markdownCount, headings: headingCount, redirects, assetReferences, javascriptDisabled: true, ssrFallback: false };
  } finally { await browser.close(); await new Promise((resolve) => http.close(resolve)); }
}
assert(Object.keys(output).length, 'Pass --ssr or --static after building the corresponding mode.');
await mkdir(path.join(root, 'artifacts'), { recursive: true });
for (const [mode, results] of Object.entries(output)) await writeFile(path.join(root, `artifacts/${mode}-verification.json`), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
