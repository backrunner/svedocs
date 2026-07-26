---
title: SEO and OG
description: Generate metadata, canonical URLs, JSON-LD, sitemap, RSS, robots, and Open Graph images.
order: 4
---

# SEO and OG

svedocs combines global config, frontmatter, route metadata, and generated page data to build each page's SEO tags.

## Frontmatter

```md
---
title: Search and Ask AI
description: Use local search, Cloudflare AI Search, and Ask AI providers.
canonical: https://svedocs.dev/docs/integrations/search-ai
image: https://svedocs.dev/og/docs-search-ai.svg
author: svedocs team
published: 2026-05-18
updated: 2026-05-18
type: article
keywords:
  - SvelteKit
  - documentation
robots: index,follow
head:
  meta:
    - name: google-site-verification
      content: page-token
  jsonLd:
    - "@type": FAQPage
      name: Search FAQ
---
```

If `site.url` is set, svedocs generates canonical URLs automatically.

Use `head` for serializable entries that belong only to this page. Global `seo.head` values come first, followed by entries from page frontmatter. The default root layout renders `meta`, `link`, and additional JSON-LD entries automatically.

## Metadata

The default root layout renders:

- `<title>` and description.
- Canonical URL.
- Open Graph and Twitter card tags.
- JSON-LD for docs pages and single pages.
- `keywords`, `robots`, and serializable `head` additions.
- Article author, publish time, and update time when frontmatter provides them.

When building a custom layout, use `createPageMetadata(config, page, pages)` from `svedocs/og`. Pass the complete page list so Open Graph locale alternates include only translations that exist.

## Sitemap, robots, and RSS

```ts title="src/routes/sitemap.xml/+server.ts"
import { createSitemapResponse } from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import type { RequestHandler } from './$types';

export const prerender = config.seo.sitemap;

export const GET: RequestHandler = ({ request }) =>
  createSitemapResponse(config, pages, request);
```

Sitemaps and robots are enabled by default. `createRobotsResponse(config, request)` provides the matching `robots.txt` response and omits its sitemap declaration when sitemap generation is disabled. Hidden and `noindex` pages are excluded. Generated templates prerender both endpoints, import the metadata-only page index, and retain cache headers plus ETag support for dynamic serving.

RSS is disabled by default. Enable it with `seo.rss: true`, or configure its `title`, `description`, `limit`, and `locale` in an object. The generated `/feed.xml` route uses `createRssResponse(config, pages, request)`, prerenders only when RSS is enabled, and automatically adds the matching feed discovery link to page metadata.

## Dynamic OG route

```ts title="src/routes/og/[...path]/+server.ts"
import { error } from '@sveltejs/kit';
import {
  createConfiguredOgImageFormat,
  createConfiguredOgImageRenderer,
  createConfiguredOgImageTemplate,
  createConfiguredPageOgImageEntries,
  createPageOgImagePath,
  createPageOgImageResponse,
  isOgImageEnabled
} from 'svedocs/og';
import config from 'virtual:svedocs/server-config';
import pages from 'virtual:svedocs/pages';

export const prerender = isOgImageEnabled(config);

const format = createConfiguredOgImageFormat(config);
const template = createConfiguredOgImageTemplate(config);

export function entries() {
  return createConfiguredPageOgImageEntries(config, pages);
}

export const GET = async ({ params }) => {
  if (!isOgImageEnabled(config)) error(404, 'OG images are disabled.');
  const requestPath = `/og/${params.path}`;
  const page = pages.find((candidate) => createPageOgImagePath(candidate, format) === requestPath);
  if (!page) error(404, `No OG image found for ${requestPath}`);
  return createPageOgImageResponse(config, page, {
    format,
    renderer: createConfiguredOgImageRenderer(config),
    ...(template ? { template } : {})
  });
};
```

SVG OG routes are portable to edge runtimes. PNG generation is available through the CLI for build-time assets.

Custom root layouts can use `createJsonLdScript(value)` from `svedocs/og` when rendering JSON-LD through Svelte `{@html ...}`. It escapes script-sensitive characters before returning the complete `<script type="application/ld+json">` tag.

## Build-time OG assets

Configure build-time defaults once:

```ts title="svedocs.config.ts"
export default defineConfig({
  seo: {
    ogImage: {
      template: 'default',
      format: 'svg',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
```

`svedocs build` generates these assets after a successful Vite build. Pass `--no-og` to skip automatic generation for CI jobs that only need the application bundle.

## PNG and Satori

```sh
svedocs og --format png --out static/og
svedocs og --renderer satori --font ./Inter-Regular.ttf --format png
```

Satori rendering requires explicit font files so output stays deterministic across machines and deployment environments.

Build-time `svedocs og` and automatic `svedocs build` generation preserve function templates from `svedocs.config.ts`. Dynamic routes can use the same template when it is safe for the target runtime; otherwise prefer the default SVG renderer for edge portability.
