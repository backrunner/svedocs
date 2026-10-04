// DOM extraction runs in a JavaScript-disabled browser; validation runs in Node.
export function snapshotSeo(route) {
  const all = (selector) => [...document.querySelectorAll(selector)];
  const content = (selector) => document.querySelector(selector)?.content;
  return {
    route, title: document.title, titleCount: all('title').length,
    lang: document.documentElement.lang, dir: document.documentElement.dir,
    description: all('meta[name="description"]').map((el) => el.content),
    canonical: all('link[rel="canonical"]').map((el) => el.getAttribute('href')),
    h1: all('h1').map((el) => el.textContent),
    alternates: all('link[hreflang]').map((el) => ({ lang: el.hreflang, href: el.getAttribute('href') })),
    robots: all('meta[name="robots"]').map((el) => el.content),
    ogImage: content('meta[property="og:image"]'), ogLocale: content('meta[property="og:locale"]'),
    ogImageWidth: content('meta[property="og:image:width"]'), ogImageHeight: content('meta[property="og:image:height"]'),
    ogImageType: content('meta[property="og:image:type"]'), twitterImageAlt: content('meta[name="twitter:image:alt"]'),
    ogImageAlt: content('meta[property="og:image:alt"]'), ogUrl: content('meta[property="og:url"]'),
    ogTitle: content('meta[property="og:title"]'), ogDescription: content('meta[property="og:description"]'),
    ogType: content('meta[property="og:type"]'), twitterTitle: content('meta[name="twitter:title"]'),
    twitterDescription: content('meta[name="twitter:description"]'), twitterImage: content('meta[name="twitter:image"]'),
    metaKeys: all('head meta').map((el) => el.name ? `name:${el.name}` : el.getAttribute('property') ? `property:${el.getAttribute('property')}` : '').filter(Boolean),
    articleTags: all('meta[property^="article:"]').map((el) => ({ property: el.getAttribute('property'), content: el.content })),
    mainCount: all('main').length, mainText: document.querySelector('main')?.textContent?.trim() ?? '',
    proseText: all('.sd-prose').map((el) => el.textContent?.trim()).join('\n'),
    contentLinks: all('a[href]').map((el) => el.getAttribute('href')),
    headingIds: all('[id]').map((el) => el.id),
    missingImageAlt: all('main img:not([alt])').map((el) => el.getAttribute('src')),
    renderErrors: all('.sd-render-error, .sd-route-render-error').length,
    jsonLd: all('script[type="application/ld+json"]').map((el) => {
      try { return JSON.parse(el.textContent); }
      catch { return { parseError: true }; }
    })
  };
}

export function detailedSeoErrors(pages, manifest, createPageAlternates, { compareSource = true } = {}) {
  const documentErrors = [], metadataErrors = [], structuredDataErrors = [], contentErrors = [];
  for (const page of pages) {
    const source = manifest.pages.find((entry) => entry.routePath === page.route);
    const locale = manifest.config.i18n.locales.find((entry) => entry.code === source.locale);
    const language = locale?.hreflang ?? source.locale ?? 'en';
    if (page.lang !== language || page.dir !== (locale?.dir ?? 'ltr')) documentErrors.push({ route: page.route, expected: { lang: language, dir: locale?.dir ?? 'ltr' }, actual: { lang: page.lang, dir: page.dir } });
    const errors = [];
    if (page.ogUrl !== page.canonical[0] || page.ogTitle !== page.title || page.twitterTitle !== page.title) errors.push('sharing title/URL mismatch');
    if (page.ogDescription !== page.description[0] || page.twitterDescription !== page.description[0] || page.twitterImage !== page.ogImage) errors.push('sharing description/image mismatch');
    if (page.ogType !== 'article' && page.articleTags.length) errors.push('article tags on a non-article');
    if (page.articleTags.some((tag) => tag.property === 'article:author' && !/^https?:\/\//.test(tag.content))) errors.push('article author must be a profile URL');
    if (page.ogImageWidth !== '1200' || page.ogImageHeight !== '630' || page.ogImageType !== 'image/png' || !page.ogImageAlt || !page.twitterImageAlt) errors.push('missing sharing image metadata');
    if (!/^[a-z]{2,3}_[A-Z]{2}$/.test(page.ogLocale)) errors.push('invalid Open Graph locale');
    if (page.robots.some((value) => /noindex/i.test(value))) errors.push('public page unexpectedly excludes indexing');
    const repeated = page.metaKeys.filter((key, index, keys) => key !== 'property:og:locale:alternate' && keys.indexOf(key) !== index);
    if (repeated.length) errors.push(`duplicate meta: ${repeated.join(', ')}`);
    const expected = createPageAlternates(manifest.config, source, manifest.pages).map(({ lang, href }) => ({ lang, href }));
    const sorted = (entries) => JSON.stringify(entries.toSorted((a, b) => a.lang.localeCompare(b.lang)));
    if (sorted(page.alternates) !== sorted(expected)) errors.push('alternate mapping differs from manifest');
    if (page.canonical[0] !== source.seo.canonical) errors.push('canonical differs from manifest');
    if (errors.length) metadataErrors.push({ route: page.route, errors });

    const schemas = page.jsonLd.flatMap(function flatten(node) {
      return Array.isArray(node['@graph']) ? node['@graph'].flatMap(flatten) : [node];
    });
    const ids = schemas.map((node) => node['@id']).filter(Boolean);
    const structured = [];
    if (schemas.some((node) => node.parseError)) structured.push('invalid JSON-LD');
    if (ids.length !== new Set(ids).size) structured.push('duplicate entity IDs');
    const primary = schemas.find((node) => [node['@type']].flat().includes(source.kind === 'doc' ? 'TechArticle' : 'WebPage'));
    const website = schemas.filter((node) => [node['@type']].flat().includes('WebSite'));
    const organization = schemas.filter((node) => [node['@type']].flat().includes('Organization'));
    if (!primary?.['@id'] || primary?.url !== page.canonical[0] || primary?.inLanguage !== language) structured.push('page entity ID/URL/language mismatch');
    if (website.length !== 1 || !website[0]?.['@id'] || primary?.isPartOf?.['@id'] !== website[0]?.['@id']) structured.push('missing shared website reference');
    if (organization.length !== 1 || !organization[0]?.['@id'] || primary?.publisher?.['@id'] !== organization[0]?.['@id']) structured.push('missing shared publisher reference');
    for (const relation of [primary?.isPartOf, primary?.publisher, primary?.author, website[0]?.publisher]) {
      if (relation?.['@id'] && !ids.includes(relation['@id'])) structured.push(`undefined reference: ${relation['@id']}`);
    }
    if (source.kind === 'doc' && source.scopePath !== '/docs') {
      const breadcrumb = schemas.find((node) => node['@type'] === 'BreadcrumbList');
      if (!breadcrumb || breadcrumb.itemListElement.some((item) => !pages.some((target) => target.canonical[0] === item.item))) structured.push('missing or broken localized breadcrumbs');
    }
    if (compareSource && source.seo.updatedTime && primary?.dateModified !== source.seo.updatedTime) structured.push('editorial modification date mismatch');
    if (structured.length) structuredDataErrors.push({ route: page.route, errors: structured });
    const content = [];
    if (page.mainCount !== 1 || page.mainText.length < 30 || page.renderErrors) content.push('missing SSR body or render error');
    if (source.kind === 'doc' && (!page.proseText || (compareSource && source.headings.some((heading) => !page.headingIds.includes(heading.id))))) content.push('missing prose/headings without JavaScript');
    if (page.missingImageAlt.length) content.push('image without alt');
    if (content.length) contentErrors.push({ route: page.route, errors: content });
  }
  return { documentErrors, metadataErrors, structuredDataErrors, contentErrors };
}

export function internalLinkErrors(pages) {
  const errors = [];
  const normalized = (path) => decodeURI(path).replace(/\/$/, '') || '/';
  for (const page of pages) {
    for (const href of page.contentLinks) {
      const url = new URL(href, page.canonical[0]);
      if (url.origin !== new URL(page.canonical[0]).origin || /\.[a-z0-9]+$/i.test(url.pathname)) continue;
      const target = pages.find((entry) => normalized(new URL(entry.canonical[0]).pathname) === normalized(url.pathname));
      if (!target) errors.push({ route: page.route, href, reason: 'Missing internal page' });
      else if (url.hash && !target.headingIds.includes(decodeURIComponent(url.hash.slice(1)))) errors.push({ route: page.route, href, reason: 'Missing internal anchor' });
    }
  }
  return errors;
}
