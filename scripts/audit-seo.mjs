// Run after building the framework and the official site in static mode.
// Assert SEO regressions against actual static HTML and image assets.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { loadConfigFromFile } from 'vite';
import { loadSvedocsContent } from '../packages/svedocs/dist/core.js';
import { isAgentUserAgent } from '../packages/svedocs/dist/agent.js';
import {
  createPageAlternates, createSitemapXml, createPageOgImagePath, createPageOgImageResponse
} from '../packages/svedocs/dist/og.js';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'apps/site');
const { config } = await loadConfigFromFile(
  { command: 'build', mode: 'production' }, path.join(site, 'svedocs.config.ts'), site, 'silent'
);
const manifest = await loadSvedocsContent({
  projectRoot: site, config: { ...config, images: false, build: { mode: 'static' } }
});
const pages = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route('**/*', (route) => route.abort());
  for (const entry of manifest.pages) {
    const html = await readFile(path.join(site, 'build', entry.routePath, 'index.html'), 'utf8');
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    pages.push(await page.evaluate((route) => ({
      route,
      title: document.title,
      titleCount: document.querySelectorAll('title').length,
      description: [...document.querySelectorAll('meta[name="description"]')].map((el) => el.content),
      canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((el) => el.getAttribute('href')),
      h1: [...document.querySelectorAll('h1')].map((el) => el.textContent),
      alternates: [...document.querySelectorAll('link[hreflang]')].map((el) => ({
        lang: el.hreflang, href: el.getAttribute('href')
      })),
      robots: [...document.querySelectorAll('meta[name="robots"]')].map((el) => el.content),
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      ogLocale: document.querySelector('meta[property="og:locale"]')?.content,
      ogImageWidth: document.querySelector('meta[property="og:image:width"]')?.content,
      ogImageHeight: document.querySelector('meta[property="og:image:height"]')?.content,
      ogImageType: document.querySelector('meta[property="og:image:type"]')?.content,
      twitterImageAlt: document.querySelector('meta[name="twitter:image:alt"]')?.content,
      ogImageAlt: document.querySelector('meta[property="og:image:alt"]')?.content,
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((el) => JSON.parse(el.textContent))
    }), entry.routePath));
  }
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
const report = {
  pageCount: pages.length,
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
await writeFile(path.join(root, 'artifacts/seo-audit.json'), JSON.stringify(report, null, 2) + '\n');
const { pages: details, ...summary } = report;
console.log(JSON.stringify(summary, null, 2));
assert(pages.length > 0);
for (const field of ['tagErrors', 'duplicateCanonicals', 'invalidAlternateTargets', 'nonreciprocalAlternates']) {
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
const sitemap = await readFile(path.join(site, 'build/sitemap.xml'), 'utf8');
for (const page of pages) {
  assert.equal(page.ogImageWidth, '1200');
  assert.equal(page.ogImageHeight, '630');
  assert.equal(page.ogImageType, 'image/png');
  assert(page.twitterImageAlt);
  assert.match(page.ogLocale, /^[a-z]{2,3}_[A-Z]{2}$/);
  const image = await readFile(path.join(site, 'build', new URL(page.ogImage).pathname));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [1200, 630]);
  const source = manifest.pages.find((entry) => entry.routePath === page.route);
  if (!source.seo.updatedTime) assert(!page.jsonLd.some((entry) => entry.dateModified));
  if (source.kind === 'doc' && source.scopePath !== '/docs') {
    const breadcrumb = page.jsonLd.find((entry) => entry['@type'] === 'BreadcrumbList');
    assert(breadcrumb, page.route);
    for (const item of breadcrumb.itemListElement) assert(pages.some((entry) => entry.canonical[0] === item.item), item.item);
  }
}
assert.equal((sitemap.match(/<lastmod>/g) ?? []).length, report.explicitUpdatedPages);
assert(!report.homeTitles.some((page) => page.title === 'svedocs' || page.title === 'svedocs | svedocs'));
assert(!report.duplicateTitles.some((group) => group.routes.some((route, index) =>
  group.routes.slice(index + 1).some((other) => route.includes('/zh/') === other.includes('/zh/')))));
