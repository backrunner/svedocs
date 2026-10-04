// Build the framework and site first. Default: static; --edge: production SSR;
// --spa: known prerendered SPA pages; --live: capture-seo-live.py snapshot.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { loadConfigFromFile } from 'vite';
import { snapshotSeo, detailedSeoErrors, internalLinkErrors } from './seo-audit-details.mjs';
import { snapshotDiscovery, discoveryErrors, responseErrors } from './seo-audit-discovery.mjs';
import { loadSvedocsContent } from '../packages/svedocs/dist/core.js';
import { isAgentUserAgent } from '../packages/svedocs/dist/agent.js';
import {
  createPageAlternates, createSitemapXml, createPageOgImagePath, createPageOgImageResponse
} from '../packages/svedocs/dist/og.js';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'apps/site');
const live = process.argv.includes('--live');
const edge = process.argv.includes('--edge');
const spa = process.argv.includes('--spa');
const snapshot = live ? JSON.parse(await readFile(path.join(root, 'artifacts/seo-live-input/index.json'), 'utf8')) : undefined;
const mode = live || edge ? 'edge' : spa ? 'spa' : 'static';
const { config } = await loadConfigFromFile(
  { command: 'build', mode: 'production' }, path.join(site, 'svedocs.config.ts'), site, 'silent'
);
const manifest = await loadSvedocsContent({
  projectRoot: site, config: { ...config, images: false, build: { mode } }
});
const pages = [];
const responses = snapshot?.pages ?? [];
const probes = snapshot?.probes ?? [];
const probePages = [];
let server;
if (edge) {
  const { Server } = await import(pathToFileURL(path.join(site, '.svelte-kit/output/server/index.js')));
  const { manifest: routes } = await import(pathToFileURL(path.join(site, '.svelte-kit/output/server/manifest.js')));
  server = new Server(routes);
  await server.init({ env: {} });
}
const respond = (url) => server.respond(new Request(url, { headers: { accept: 'text/html', 'user-agent': 'Googlebot' } }), { getClientAddress: () => '127.0.0.1' });
const endpoint = (name) => readFile(live ? path.join(root, 'artifacts/seo-live-input', name)
  : path.join(site, edge ? '.svelte-kit/output/prerendered/pages' : 'build', name), 'utf8');
let discovery;
const robots = await endpoint('robots.txt');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route('**/*', (route) => route.abort());
  for (const entry of manifest.pages) {
    let html;
    if (edge) {
      const response = await respond(new URL(entry.routePath, config.site.url));
      responses.push({ route: entry.routePath, status: response.status, contentType: response.headers.get('content-type'), robotsHeader: response.headers.get('x-robots-tag') });
      html = await response.text();
    } else {
      const file = live ? path.join(root, 'artifacts/seo-live-input', snapshot.pages.find((item) => item.route === entry.routePath).file)
        : path.join(site, 'build', entry.routePath, 'index.html');
      html = await readFile(file, 'utf8');
    }
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    pages.push(await page.evaluate(snapshotSeo, entry.routePath));
  }
  if (edge) {
    for (const pathname of ['/docs/seo-audit-missing', '/docs/zh/seo-audit-missing', '/docs/integrations/seo-og/', '/docs/zh/integrations/seo-og/']) {
      const url = new URL(pathname, config.site.url).href;
      let response = await respond(url);
      let finalUrl = url;
      if (response.status >= 300 && response.status < 400) {
        finalUrl = new URL(response.headers.get('location'), url).href;
        response = await respond(finalUrl);
      }
      const html = await response.text();
      probes.push({ url, status: response.status, finalUrl });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      probePages.push(await page.evaluate(snapshotSeo, pathname));
    }
  } else if (live) {
    for (const probe of probes) {
      await page.setContent(await readFile(path.join(root, 'artifacts/seo-live-input', probe.file), 'utf8'), { waitUntil: 'domcontentloaded' });
      probePages.push(await page.evaluate(snapshotSeo, new URL(probe.url).pathname));
    }
  }
  discovery = await page.evaluate(snapshotDiscovery, { sitemap: await endpoint('sitemap.xml'), rss: await endpoint('feed.xml') });
} finally {
  await browser.close();
}

const duplicateGroups = (field) => Object.entries(Object.groupBy(pages, field))
  .filter(([, group]) => group.length > 1)
  .map(([value, group]) => ({ value, routes: group.map((page) => page.route) }));
const en = manifest.pages.find((page) => page.routePath === '/docs');
const zh = manifest.pages.find((page) => page.routePath === '/docs/zh');
assert(en && zh, 'Expected official site translation fixtures');
const excluded = { ...zh, seo: { ...zh.seo, robots: 'noindex,follow' } };
const changed = { ...en, title: 'New title', seo: { ...en.seo, title: 'New title', description: 'Changed description' } };
const imageResponse = await createPageOgImageResponse(manifest.config, en);
const duplicate = { ...en, id: 'canonical-alias', routePath: '/docs/alias', scopePath: '/docs/alias' };
const assetErrors = [];
for (const page of pages) {
  try {
    const asset = live ? snapshot.images.find((item) => item.url === page.ogImage) : undefined;
    if (live && (asset?.status !== 200 || !asset.contentType?.includes('image/png'))) throw new Error('Sharing image HTTP response is not PNG/200');
    let image;
    if (live) image = await readFile(path.join(root, 'artifacts/seo-live-input', asset.file));
    else if (!edge) image = await readFile(path.join(site, 'build', new URL(page.ogImage).pathname));
    else {
      for (const dir of ['client', 'prerendered/pages', 'prerendered/dependencies']) {
        try { image = await readFile(path.join(site, '.svelte-kit/output', dir, new URL(page.ogImage).pathname)); break; } catch {}
      }
      assert(image, `Missing emitted sharing image: ${page.ogImage}`);
    }
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [1200, 630]);
  } catch (error) { assetErrors.push({ route: page.route, image: page.ogImage, error: error.message }); }
}
const report = {
  source: live ? config.site.url : edge ? 'local production SSR' : `local ${mode} build`,
  ...(live && snapshot.capturedAt ? { capturedAt: snapshot.capturedAt } : {}),
  buildMode: mode,
  javascriptDisabled: true,
  pageCount: pages.length,
  pagesPerLocale: Object.fromEntries(manifest.config.i18n.locales.map((locale) => [locale.code, manifest.pages.filter((page) => page.locale === locale.code).length])),
  ...detailedSeoErrors(pages, manifest, createPageAlternates, { compareSource: !live }),
  internalLinkErrors: internalLinkErrors(pages),
  discoveryErrors: discoveryErrors(discovery, robots, pages, manifest, { compareSource: !live }),
  assetErrors,
  responseErrors: responseErrors(responses, probes, probePages, mode),
  discovery: { sitemapPages: discovery.sitemap.length, rssPages: discovery.rssItems.length, rssLanguage: discovery.rssLanguage },
  responseProbes: probes,
  tagErrors: pages.filter((page) => page.titleCount !== 1 || !page.title.trim()
    || page.description.length !== 1 || !page.description[0]?.trim()
    || page.canonical.length !== 1 || !/^https:\/\//.test(page.canonical[0]) || page.h1.length !== 1),
  duplicateCanonicals: duplicateGroups((page) => page.canonical[0]),
  duplicateTitles: duplicateGroups((page) => page.title),
  duplicateDescriptions: duplicateGroups((page) => page.description[0]),
  invalidAlternateTargets: pages.flatMap((page) => page.alternates.filter((alternate) =>
    !pages.some((target) => target.canonical[0] === alternate.href)).map((alternate) => ({ route: page.route, ...alternate }))),
  nonreciprocalAlternates: pages.flatMap((page) => page.alternates.filter((alternate) =>
    alternate.lang !== 'x-default' && !pages.find((target) => target.canonical[0] === alternate.href)
      ?.alternates.some((back) => back.href === page.canonical[0])).map((alternate) => ({ route: page.route, ...alternate }))),
  homeTitles: pages.filter((page) => ['/', '/zh'].includes(page.route))
    .map(({ route, title, h1 }) => ({ route, title, h1 })),
  svgOgPages: pages.filter((page) => page.ogImage?.endsWith('.svg')).length,
  missingOgImageAlt: pages.filter((page) => !page.ogImageAlt).length,
  jsonLdTypes: [...new Set(pages.flatMap((page) => page.jsonLd.map((entry) => entry['@type'])))],
  ogLocales: [...new Set(pages.map((page) => page.ogLocale))],
  explicitUpdatedPages: manifest.pages.filter((page) => page.seo.updatedTime).length,
  legacyFilesystemDatePages: manifest.pages.filter((page) => !page.seo.updatedTime && page.lastUpdated).length,
  defaultAgentClassification: Object.fromEntries(['Googlebot', 'bingbot', 'GPTBot'].map((ua) => [ua, isAgentUserAgent(ua)])),
  issues: manifest.issues,
  reproductions: {
    noindexHtmlAlternates: createPageAlternates(manifest.config, en, [en, excluded]),
    noindexSitemapContainsZh: createSitemapXml(manifest.config, [en, excluded]).includes(zh.seo.canonical),
    ogPathBefore: createPageOgImagePath(en, 'png'),
    ogPathAfter: createPageOgImagePath(changed, 'png'),
    ogCacheControl: imageResponse.headers.get('cache-control'),
    duplicateSitemapLocations: [...createSitemapXml(manifest.config, [en, duplicate]).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
    noindexViaHeadIsInSitemap: createSitemapXml(manifest.config, [{
      ...en, seo: { ...en.seo, head: { meta: [{ name: 'robots', content: 'noindex' }] } }
    }]).includes(en.seo.canonical)
  },
  pages
};
await mkdir(path.join(root, 'artifacts'), { recursive: true });
await writeFile(path.join(root, live ? 'artifacts/seo-live-audit.json' : edge ? 'artifacts/seo-edge-audit.json' : spa ? 'artifacts/seo-spa-audit.json' : 'artifacts/seo-audit.json'), JSON.stringify(report, null, 2) + '\n');
const { pages: details, ...summary } = report;
console.log(JSON.stringify(summary, null, 2));
assert(pages.length > 0);
for (const field of ['tagErrors', 'duplicateCanonicals', 'invalidAlternateTargets', 'nonreciprocalAlternates', 'documentErrors', 'metadataErrors', 'structuredDataErrors', 'contentErrors', 'discoveryErrors', 'responseErrors', 'assetErrors', 'internalLinkErrors']) {
  assert.deepEqual(report[field], [], field);
}
assert.equal(report.defaultAgentClassification.Googlebot, false);
assert.equal(report.defaultAgentClassification.bingbot, false);

assert.equal(report.svgOgPages, 0);
assert.equal(report.missingOgImageAlt, 0);
assert.equal(report.reproductions.noindexSitemapContainsZh, false);
assert(!report.reproductions.noindexHtmlAlternates.some((alternate) => alternate.locale === 'zh'));
assert.equal(report.reproductions.noindexViaHeadIsInSitemap, false);
assert.equal(report.reproductions.duplicateSitemapLocations.length, 1);
assert.equal(report.reproductions.ogCacheControl, 'public, max-age=0, must-revalidate');
const sitemap = await endpoint('sitemap.xml');
for (const page of pages) {
  assert.equal(page.ogImageWidth, '1200');
  assert.equal(page.ogImageHeight, '630');
  assert.equal(page.ogImageType, 'image/png');
  assert(page.twitterImageAlt);
  assert.match(page.ogLocale, /^[a-z]{2,3}_[A-Z]{2}$/);
  const source = manifest.pages.find((entry) => entry.routePath === page.route);
  if (!live && !source.seo.updatedTime) assert(!page.jsonLd.some((entry) => entry.dateModified));
  if (source.kind === 'doc' && source.scopePath !== '/docs') {
    const breadcrumb = page.jsonLd.find((entry) => entry['@type'] === 'BreadcrumbList');
    assert(breadcrumb, page.route);
    for (const item of breadcrumb.itemListElement) assert(pages.some((entry) => entry.canonical[0] === item.item), item.item);
  }
}
if (!live) assert.equal((sitemap.match(/<lastmod>/g) ?? []).length, report.explicitUpdatedPages);
assert(!report.homeTitles.some((page) => page.title === 'svedocs' || page.title === 'svedocs | svedocs'));
assert(!report.duplicateTitles.some((group) => group.routes.some((route, index) =>
  group.routes.slice(index + 1).some((other) => route.includes('/zh/') === other.includes('/zh/')))));
