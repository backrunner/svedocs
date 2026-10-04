---
title: SEO and OG
description: Generate metadata, canonical URLs, JSON-LD, sitemap, RSS, robots, and Open Graph images.
order: 4
updatedTime: 2026-10-05
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
- Article profile URL, publish time, and update time when provided on article pages.

When building a custom layout, use `createPageMetadata(config, page, pages)` from `svedocs/og`. Pass the complete page list so Open Graph locale alternates include only translations that exist.

## Shared structured data

With `site.url`, each page gets a stable `@id` (`<canonical>#article` for docs or `<canonical>#webpage` for standalone pages). `isPartOf` references the shared `<site.url>/#website` entity. When the configured default author is an organization, or `seo.head.jsonLd` supplies the site's Organization, `publisher` references that entity too. Author names continue to describe the page author independently.

Custom JSON-LD with the same `@id` merges into generated entities; page entries override global entries. Custom WebSite and Organization entries matching `site.url` reuse their explicit IDs. A custom page entity matching the canonical URL also merges into the generated page. Anonymous `@graph` containers are expanded while retaining their context; named graphs remain intact. Identical anonymous entries are removed, while distinct entities of the same type are preserved. Use explicit `@id` values for reliable identity.

## Replace SEO rendering

Register a `Seo` component independently of the page layout:

```ts title="vite.config.ts"
svedocs({
  config: svedocsConfig,
  theme: { components: { Seo: '$lib/theme/Seo.svelte' } }
});
```

```svelte title="src/lib/theme/Seo.svelte"
<script lang="ts">
  import type { SvedocsSeoProps } from 'svedocs/theme/types';
  let { context, metadata, alternates, title, description, robots }: SvedocsSeoProps = $props();
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if robots}<meta name="robots" content={robots} />{/if}
  {#if metadata?.canonical}<link rel="canonical" href={metadata.canonical} />{/if}
  {#each alternates ?? [] as alternate}
    <link rel="alternate" hreflang={alternate.lang} href={alternate.href} />
  {/each}
  <meta name="author" content={context.config.seo.defaultAuthor} />
</svelte:head>
```

The replacement owns the complete SEO head, including Open Graph, Twitter and JSON-LD. Render the exported default `Seo` component inside your replacement if you only want to add tags. This hook runs during SSR, prerendering and client navigation; it does not require a client-side effect. `metadata` is undefined for error pages. Replacements of `Root` must include their own SEO renderer.

## Document language and URL rules

Generated templates set `<html lang dir>` on the server with `createSvedocsHtmlHandle`. Existing projects should add it to `src/hooks.server.ts`; compose it with agent negotiation and other hooks using SvelteKit's `sequence`:

```ts title="src/hooks.server.ts"
import { sequence } from '@sveltejs/kit/hooks';
import { createSvedocsHtmlHandle } from 'svedocs/routes';
import { createSvedocsAgentHandle } from 'svedocs/agent';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import markdown from 'virtual:svedocs/markdown';

export const handle = sequence(
  createSvedocsHtmlHandle({ config, pages }),
  createSvedocsAgentHandle({ config, pages, markdown })
);
```

The document language uses the locale's `hreflang`, falling back to its code. Direction uses the configured `dir` (`ltr` by default; set `dir: 'rtl'` for right-to-left locales). Localized 404s use their requested locale. The default layout also carries these attributes and updates the document after client navigation.

Local page URLs use no trailing slash in `edge`, and a trailing slash in `static` and `spa` (except `/`). Generated and same-origin custom canonicals, hreflang, Open Graph URLs, sitemap, RSS, breadcrumbs, IndexNow and resolved content links share this rule. Canonical fragments are removed; queries are retained. External canonical paths and asset/endpoint URLs keep their own slash conventions.

## Crawling without JavaScript

Keep `svedocsSsr()`, `svedocsPagePrerender()` and the generated route `entries()` connected. Edge pages contain server-rendered text and SEO tags; static builds and known SPA routes contain prerendered HTML. Crawlers and readers can access headings, prose and links without executing JavaScript. Interactive search, Ask AI and theme controls still require JavaScript. A SPA fallback cannot provide unknown routes' content without JavaScript; use edge SSR or full static output when those routes must be crawlable.

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

export const prerender = isOgImageEnabled(config) ? 'auto' : false;

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

PNG is the default sharing format. Generate it at build time with the CLI or the prerendered OG route; the Node PNG renderer is not available for dynamic Cloudflare requests. SVG remains an explicit option for dynamic edge rendering. Stable OG URLs use `max-age=0, must-revalidate` so content updates do not retain year-long immutable responses. Configure equivalent revalidation on your static host if it overrides asset caching.

Custom root layouts can use `createJsonLdScript(value)` from `svedocs/og` when rendering JSON-LD through Svelte `{@html ...}`. It escapes script-sensitive characters before returning the complete `<script type="application/ld+json">` tag.

## Build-time OG assets

Configure build-time defaults once:

```ts title="svedocs.config.ts"
export default defineConfig({
  seo: {
    ogImage: {
      template: 'default',
      format: 'png',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
```

`svedocs build` generates these assets before Vite copies static files. Pass `--no-og` to skip automatic generation for CI jobs that only need the application bundle.

## PNG and Satori

```sh
svedocs og --format png --out static/og
svedocs og --renderer satori --font ./Inter-Regular.ttf --format png
```

Satori rendering requires explicit font files so output stays deterministic across machines and deployment environments.

Build-time `svedocs og` and automatic `svedocs build` generation preserve function templates from `svedocs.config.ts`. Dynamic routes can use the same template when it is safe for the target runtime; otherwise prefer the default SVG renderer for edge portability.

## Automatic generation and OG routes

`svedocs build` generates OG images before Vite copies static assets into the deployment output. If the project also provides an `/og/[...path]` route, set its `prerender` to `'auto'` when enabled and `false` when disabled. Existing static images can then satisfy those paths; when files are absent, SvelteKit still prerenders the route’s `entries()`. Generated templates include the appropriate setup. Update older project routes to avoid an unseen OG route error when static images already exist.

## Titles, indexing, and structured data

Use `seoTitle` in frontmatter to customize the search/share title without changing the visible article or navigation title. Localized homepages do not repeat the site-name suffix.

```yaml
---
title: Components
seoTitle: Theme component reference
updatedTime: 2026-09-07
author: Documentation team
authorType: Organization
authorUrl: https://example.com/team
image: /images/components.png
imageAlt: Component relationships
imageWidth: 1200
imageHeight: 630
imageType: image/png
---
```

`updatedTime` supplies sitemap `lastmod`, JSON-LD `dateModified`, article modification tags on document pages, and the default theme’s visible update date. Filesystem `lastUpdated` remains available on the page model, but is not used for SEO dates because a checkout can change it. Omit `updatedTime` when no reliable editorial date is available. RSS uses explicit updated/published dates and omits a date when neither exists.

Page `robots` and global/page `head.meta` tags named `robots` combine conservatively: a global `noindex` cannot be overridden by a page's `index`. The same rule filters sitemap, hreflang, RSS, and agent discovery. Hidden pages remain excluded from discovery. Bot-specific tags such as `googlebot` retain their targeted meaning.

The default theme generates `BreadcrumbList` from real localized ancestors and preserves a custom breadcrumb graph supplied through `head.jsonLd`. Configure `seo.defaultAuthorType: 'Organization'` for a team, or use page `authorType`; the backward-compatible default is `Person`. `author` is the JSON-LD name; `authorUrl` is an HTTP(S) profile URL (site-relative URLs are supported), with `seo.defaultAuthorUrl` as the global default. Open Graph `article:author` only emits a URL and is omitted without one. Overriding the author name does not inherit a different default author’s URL. Article tags only appear on `og:type=article` pages.

Set an explicit `ogLocale` on an i18n locale when its `hreflang` contains no region, for example `{ code: 'en', hreflang: 'en', ogLocale: 'en_GB' }`. Language-only hreflang stays unchanged; a territory is never guessed for Open Graph.

The SVG-to-PNG renderer uses fonts installed in the build environment. For reproducible Chinese images across machines, use Satori with explicit `--font` files containing the required glyphs and generate static assets before deployment.
