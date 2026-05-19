---
title: SEO and OG
description: Generate metadata, canonical URLs, JSON-LD, sitemap, robots, and Open Graph images.
order: 9
---

# SEO and OG

SEO data is resolved from global config, frontmatter, route metadata, and generated page data.

## Frontmatter

```md
---
title: Search and Ask AI
description: Use local search, Cloudflare AI Search, and Ask AI providers.
canonical: https://svedocs.dev/docs/search-ai
image: https://svedocs.dev/og/docs-search-ai.svg
author: svedocs team
published: 2026-05-18
updated: 2026-05-18
type: article
keywords:
  - SvelteKit
  - documentation
---
```

If `site.url` is set, svedocs generates canonical URLs automatically.

## Metadata

The default root layout renders:

- `<title>` and description.
- Canonical URL.
- Open Graph and Twitter card tags.
- JSON-LD for docs pages and single pages.
- Article author, publish time, and update time when frontmatter provides them.

Use `createPageMetadata(config, page)` from `svedocs/og` when building custom layouts.

## Sitemap and Robots

```ts title="src/routes/sitemap.xml/+server.ts"
import { createSitemapXml } from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/pages';

export const GET = () => {
  return new Response(createSitemapXml(config, pages), {
    headers: { 'content-type': 'application/xml; charset=utf-8' }
  });
};
```

`createRobotsTxt(config)` provides a matching `robots.txt` response.

## Dynamic OG Route

```ts title="src/routes/og/[...path]/+server.ts"
import { error } from '@sveltejs/kit';
import {
  createConfiguredOgImageFormat,
  createConfiguredOgImageRenderer,
  createConfiguredOgImageTemplate,
  createPageOgImageEntries,
  createPageOgImagePath,
  createPageOgImageResponse
} from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/pages';

export const prerender = true;

const format = createConfiguredOgImageFormat(config);

export function entries() {
  return createPageOgImageEntries(pages, format);
}

export const GET = async ({ params }) => {
  const requestPath = `/og/${params.path}`;
  const page = pages.find((candidate) => createPageOgImagePath(candidate, format) === requestPath);
  if (!page) error(404, `No OG image found for ${requestPath}`);
  return createPageOgImageResponse(config, page, {
    format,
    renderer: createConfiguredOgImageRenderer(config),
    template: createConfiguredOgImageTemplate(config)
  });
};
```

SVG OG routes are portable to edge runtimes. PNG generation is available through the CLI for build-time assets.

## Build-time OG Assets

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
