---
title: Integrations
description: Connect search, Ask AI, Cloudflare deployment, SEO, and Open Graph features without losing local fallbacks.
order: 5
---

# Integrations

svedocs integrations are designed around one principle: the docs site should work locally before external services are configured. Hosted search, Ask AI, Cloudflare bindings, and OG generation can be added incrementally once the content model is stable.

## Integration map

| Area | Start with | Move to production when |
| --- | --- | --- |
| Search | Local MiniSearch records from the manifest. | You need a hosted index, typo tolerance, analytics, or Cloudflare AI Search. |
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

This order avoids debugging provider credentials while the content tree is still changing.

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

The configured helpers read `svedocs.config.ts`, use hosted providers when credentials or bindings exist, and keep local fallback behavior for development and static builds.

## Build-time pattern

Build-time integrations use CLI commands:

```sh
svedocs check --strict
svedocs index --provider cloudflare-ai-search --dry-run
svedocs og --format svg --out static/og
svedocs deploy cloudflare setup --write
svedocs deploy cloudflare
```

Use dry-runs in CI until credentials are ready. Setup commands print or write generated output so deployment changes stay reviewable; the deploy command then builds and publishes through Wrangler.

## Security and operations

- Put provider keys in runtime environment variables, not in content files or committed config.
- Keep `.dev.vars.example` as documentation for required local variables.
- Use memory rate limiting only for local development.
- Use KV or another shared rate limiter for production Ask AI.
- Prefer server-routed search keys over embedding search credentials in client code.
- Keep Cloudflare remote bindings disabled locally unless you intentionally want local development to mutate remote resources.

## Pages in this section

[Search and Ask AI](/docs/integrations/search-ai "card: Providers, routes, indexing, citations, streaming, and rate limits.")

[Cloudflare](/docs/integrations/cloudflare "card: Build presets, Wrangler output, AI Search bindings, Workers AI, and local development.")

[SEO and OG](/docs/integrations/seo-og "card: Metadata, canonical URLs, sitemap, robots, JSON-LD, dynamic OG routes, and build-time assets.")

## Choosing a path

If you are building a small docs site, start with local search, SVG OG images, and static output. If you are building a product docs site with live AI or provider-backed search, use edge mode and add hosted integrations after the content structure is reliable.
