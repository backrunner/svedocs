// Parse the emitted discovery documents using the browser's XML parser.
export function snapshotDiscovery({ sitemap, rss }) {
  const parser = new DOMParser();
  const map = parser.parseFromString(sitemap, 'application/xml');
  const feed = parser.parseFromString(rss, 'application/xml');
  const text = (node, tag) => node.getElementsByTagName(tag)[0]?.textContent;
  return {
    parseErrors: [map, feed].filter((doc) => doc.querySelector('parsererror')).length,
    sitemap: [...map.getElementsByTagName('url')].map((node) => ({
      loc: text(node, 'loc'), lastmod: text(node, 'lastmod'),
      alternates: [...node.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')]
        .map((link) => ({ lang: link.getAttribute('hreflang'), href: link.getAttribute('href') }))
    })),
    rssLanguage: text(feed, 'language'),
    rssItems: [...feed.getElementsByTagName('item')].map((node) => ({
      link: text(node, 'link'), guid: text(node, 'guid'), date: text(node, 'pubDate')
    }))
  };
}

export function discoveryErrors(discovery, robots, pages, manifest, { compareSource = true } = {}) {
  const errors = [];
  if (discovery.parseErrors) errors.push('Invalid XML');
  const urls = pages.map((page) => page.canonical[0]).toSorted();
  const locations = discovery.sitemap.map((entry) => entry.loc).toSorted();
  if (JSON.stringify(urls) !== JSON.stringify(locations)) errors.push('Sitemap must contain each public canonical exactly once');
  const sorted = (entries) => JSON.stringify(entries.toSorted((a, b) => a.lang.localeCompare(b.lang)));
  for (const entry of discovery.sitemap) {
    const page = pages.find((page) => page.canonical[0] === entry.loc);
    if (!page) continue;
    if (sorted(page.alternates) !== sorted(entry.alternates)) errors.push(`Sitemap hreflang differs from HTML: ${page.route}`);
    const source = manifest.pages.find((entry) => entry.routePath === page.route);
    if (compareSource && entry.lastmod !== source.seo.updatedTime) errors.push(`Sitemap editorial date mismatch: ${page.route}`);
  }
  if (!robots.includes(`Sitemap: ${new URL('/sitemap.xml', manifest.config.site.url).href}`)) errors.push('Missing robots sitemap declaration');
  if (!/^Allow: \/$/m.test(robots) || /^Disallow:\s*\/$/m.test(robots)) errors.push('Robots blocks public pages');
  const locale = manifest.config.seo.rss.locale ?? manifest.config.i18n.defaultLocale;
  const language = manifest.config.i18n.locales.find((entry) => entry.code === locale)?.hreflang ?? locale;
  if (discovery.rssLanguage !== language) errors.push('RSS language differs from configured locale');
  const expectedFeed = manifest.pages.filter((entry) => entry.locale === locale).map((entry) => entry.seo.canonical);
  const feedLinks = discovery.rssItems.map((entry) => entry.link);
  if (feedLinks.length !== new Set(feedLinks).size) errors.push('Duplicate RSS links');
  if (expectedFeed.length <= manifest.config.seo.rss.limit && JSON.stringify(expectedFeed.toSorted()) !== JSON.stringify(feedLinks.toSorted())) errors.push('RSS missing pages or includes wrong locale');
  for (const item of discovery.rssItems) {
    const source = manifest.pages.find((entry) => entry.seo.canonical === item.link);
    if (!source || source.locale !== locale || item.guid !== item.link) errors.push(`RSS canonical or locale mismatch: ${item.link}`);
    const date = source?.seo.updatedTime ?? source?.seo.publishedTime;
    if (compareSource && item.date !== (date ? new Date(date).toUTCString() : undefined)) errors.push(`RSS editorial date mismatch: ${item.link}`);
  }
  return errors;
}

export function responseErrors(responses, probes, snapshots, mode) {
  const errors = responses.filter((entry) => entry.status !== 200 || !entry.contentType?.includes('text/html') || /noindex/i.test(entry.robotsHeader ?? ''))
    .map((entry) => ({ route: entry.route, reason: 'Public page response is not indexable HTML', status: entry.status }));
  for (const probe of probes) {
    const pathname = new URL(probe.url).pathname;
    const page = snapshots.find((page) => page.route === pathname);
    if (pathname.includes('seo-audit-missing')) {
      if (probe.status !== 404 || !page?.robots.some((value) => /noindex/i.test(value))) errors.push({ route: pathname, reason: 'Missing page must return 404 and noindex' });
      if (page?.canonical.length) errors.push({ route: pathname, reason: 'Missing page must not claim a canonical page' });
      if (page?.lang !== (pathname.includes('/zh/') ? 'zh-CN' : 'en') || page?.dir !== 'ltr') errors.push({ route: pathname, reason: 'Incorrect error document language or direction' });
    } else if (mode === 'edge' && (!probe.finalUrl.endsWith(pathname.replace(/\/$/, '')) || probe.status !== 200)) {
      errors.push({ route: pathname, reason: 'Trailing slash does not redirect to edge canonical' });
    }
  }
  return errors;
}
