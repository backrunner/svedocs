---
title: Cloudflare
description: Deploy svedocs to Cloudflare Pages with edge SSR, static output, Workers AI, and AI Search bindings.
order: 3
---

# Cloudflare

svedocs defaults to edge SSR on Cloudflare, but it can also produce a fully static site. SPA output is available for constrained hosts that need client-side routing while still serving prerendered pages where possible.

## Build preset

```ts title="svelte.config.js"
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { createCloudflarePreset } from 'svedocs/cloudflare';

const preset = createCloudflarePreset(process.env.SVEDOCS_BUILD_MODE ?? 'edge');

export default {
  kit: {
    adapter: preset.adapter === '@sveltejs/adapter-cloudflare'
      ? adapterCloudflare({ platformProxy: { remoteBindings: false, persist: false } })
      : adapterStatic({ fallback: preset.mode === 'spa' ? '200.html' : undefined })
  }
};
```

## Wrangler

`svedocs deploy cloudflare setup --write` creates a baseline `wrangler.toml` from your resolved config. The shorter `svedocs deploy cloudflare` command checks for `wrangler.toml` or `wrangler.jsonc`; when neither exists, it writes the setup files first, then builds and publishes with `wrangler pages deploy`.

```toml title="wrangler.toml"
name = "my-docs"
compatibility_date = "2026-05-18"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[ai_search]]
binding = "SVEDOCS_AI_SEARCH"
instance_name = "svedocs"
```

For AI Search namespaces, configure `cloudflare.aiSearch.namespace`; svedocs will emit `[[ai_search_namespaces]]` instead of `[[ai_search]]`.

Use `--mode static` or `--mode spa` with either setup or deploy when the Cloudflare Pages output should be `build` instead of the default edge SSR output.

The local adapter disables `platformProxy.remoteBindings` by default, so edge builds and prerendering do not require a Cloudflare account. Unsupported local AI Search bindings are omitted from runtime provider resolution and fall back to local behavior. Set `SVEDOCS_REMOTE_BINDINGS=true` when local development should access Cloudflare resources. The adapter also disables `platformProxy.persist` to avoid Miniflare state locks after repeated dev-server restarts.

## Runtime types

```ts title="svedocs.config.ts"
export default defineConfig({
  search: { provider: 'cloudflare-ai-search' },
  ai: { provider: 'cloudflare-ai-search' },
  cloudflare: {
    aiSearch: {
      binding: 'SVEDOCS_AI_SEARCH',
      instanceName: 'svedocs'
    }
  }
});
```

The generated platform declaration types the `SVEDOCS_AI_SEARCH` binding. Workers AI can be enabled with `ai.provider = 'cloudflare-workers-ai'`, which emits the `AI` binding.

AI Search is opt-in. A default project keeps MiniSearch local search, and only emits AI Search bindings when `search.provider` or `ai.provider` is set to `cloudflare-ai-search`.

## Local development

Template routes remain usable without Cloudflare bindings. `createConfiguredSearchResponse` uses local JSON search when AI Search is unavailable, while `createConfiguredAskResponse` returns a mock answer with local citations when no AI Search, Workers AI, or OpenAI-compatible credentials are present.

Use `.dev.vars.example` for environment names and keep real tokens out of the repository.

## Cache public SSR pages

Markdown is compiled to HTML during the Vite build, so production SSR does not parse it again. For public documentation whose entire HTML is independent of cookies, headers, user identity and request-local data, `createSvedocsHtmlCacheHandle` can also reuse the rendered page within a Worker isolate. Enable this explicitly for selected routes:

```ts title="src/hooks.server.ts"
import { building, dev } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import { createSvedocsAgentHandle } from 'svedocs/agent';
import { createSvedocsHtmlCacheHandle } from 'svedocs/cloudflare';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import markdown from 'virtual:svedocs/markdown';

export const handle = sequence(
  createSvedocsAgentHandle({ config, pages, markdown }),
  createSvedocsHtmlCacheHandle({
    config, pages,
    enabled: !dev && !building,
    include: (page) => page.kind === 'doc' && page.sourcePath.endsWith('.md')
      && (!page.frontmatter.layout || page.frontmatter.layout === 'docs'),
    maxAge: 60
  })
);
```

The example assumes the default documentation theme and no request-dependent page overrides. Do not include personalized themes, custom layouts or components whose SSR output depends on a request. Keep authentication outside the cache, and put agent negotiation before it as shown.

The cache defaults to 60 seconds, 128 entries, 8 MiB total body bytes and 512 KiB per page. Configure `maxAge`, `maxEntries`, `maxBytes` and `maxEntryBytes` on the handle. Responses larger than the limit, or bodies that do not finish within 100 ms, are returned normally without caching. Each hit gets its own response/body, while simultaneous eligible misses share the fill. Entries expire or are evicted when full; a new handle or deployment starts empty. This is in-memory reuse, not persistent Cloudflare Cache API storage, and it adds no public cache headers.

Cookie/authorization requests, query strings, range/precondition requests, explicit revalidation, agent negotiation and non-page routes bypass the cache. Private/no-store responses, cookies set during rendering, non-200 responses, `Vary`, encoded responses and nonce CSP are not stored. HEAD and ETag conditional GET work on cached HTML. Static and SPA builds always bypass this hook; keep `!building` and `!dev` to disable it during prerendering and development as well.
