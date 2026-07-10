---
title: Integrations
description: Add search, Ask AI, Cloudflare deployment, SEO, and Open Graph features to a svedocs site.
order: 5
---

# Integrations

You can build and preview a complete svedocs site without connecting an external service. Start with the local options, then add hosted search, Ask AI, Cloudflare bindings, or custom OG generation when the site needs them.

## Where to start

| Area | Start with | Move to production when |
| --- | --- | --- |
| Search | Local MiniSearch records generated from your pages. | You need a hosted index, typo tolerance, analytics, or Cloudflare AI Search. |
| Ask AI | Mock provider with local citations. | You have enough docs content to answer real questions and can enforce rate limits. |
| Cloudflare | Local adapter config with remote bindings disabled. | You need edge SSR, AI Search, Workers AI, or Pages deployment. |
| SEO | Generated metadata from config and frontmatter. | Public pages need canonical URLs, sitemap, robots, JSON-LD, and OG images. |
| OG images | SVG route or build-time SVG assets. | You need PNG or custom Satori templates with explicit fonts. |

## Recommended order

1. Write content and run `svedocs check`.
2. Set `site.url`, descriptions, and canonical behavior.
3. Add sitemap, robots, and OG routes.
4. Enable local search and confirm useful section results.
5. Choose a hosted search provider only if local search is not enough.
6. Add Ask AI after search records and citations are high quality.
7. Add Cloudflare bindings, rate limits, and deployment config.

This lets you evaluate search quality and citations before credentials and remote indexes enter the picture.

## Runtime route pattern

Most integrations use the same SvelteKit route pattern:

```ts title="src/routes/api/search/+server.ts"
import { createConfiguredSearchResponse } from 'svedocs/search';
import config from 'virtual:svedocs/config';
import records from 'virtual:svedocs/search';

export const GET = ({ platform, request }) => {
  return createConfiguredSearchResponse(config, records, request, {
    env: platform?.env ?? process.env
  });
};
```

The configured response utilities read `svedocs.config.ts` and select the requested service. During development or a static build, they can use the local implementation when credentials or bindings are unavailable.

## Build-time pattern

Build-time integrations use CLI commands:

```sh
svedocs check --strict
svedocs index --provider cloudflare-ai-search --dry-run
svedocs og --format svg --out static/og
svedocs deploy cloudflare setup --write
svedocs deploy cloudflare
```

Use dry runs in CI until credentials are available. Setup commands print or write their generated files, making deployment changes easy to review. The deploy command then builds the site and publishes it through Wrangler.

## Security and operations

- Put provider keys in runtime environment variables, not in content files or committed config.
- Keep `.dev.vars.example` as documentation for required local variables.
- Use memory rate limiting only for local development.
- Use KV or another shared rate limiter for production Ask AI.
- Prefer server-routed search keys over embedding search credentials in client code.
- Keep Cloudflare remote bindings disabled unless local development needs to modify remote resources.

## Pages in this section

[Search and Ask AI](/docs/integrations/search-ai "card: Providers, routes, indexing, citations, streaming, and rate limits.")

[Cloudflare](/docs/integrations/cloudflare "card: Build presets, Wrangler output, AI Search bindings, Workers AI, and local development.")

[SEO and OG](/docs/integrations/seo-og "card: Metadata, canonical URLs, sitemap, robots, JSON-LD, dynamic OG routes, and build-time assets.")

## Choosing a path

For a small docs site, local search, SVG OG images, and static output may be all you need. Choose edge mode when the site needs live AI, hosted search, or another server-side integration.
