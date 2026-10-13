---
title: Cloudflare
seoTitle: Cloudflare deployment and edge caching
description: Deploy svedocs to Cloudflare Pages with edge SSR, static output, Workers AI, and AI Search bindings.
order: 3
updatedTime: 2026-10-13
---

# Cloudflare

svedocs defaults to edge SSR on Cloudflare, but it can also produce a fully static site. SPA output is available for constrained hosts that need client-side routing while still serving prerendered pages where possible.

## Build preset

```ts title="vite.config.ts"
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { createCloudflarePreset } from 'svedocs/cloudflare';

const preset = createCloudflarePreset(process.env.SVEDOCS_BUILD_MODE ?? 'edge');

// Within the existing Vite plugins array; retain svedocs and the preprocessors.
sveltekit({
  adapter: preset.adapter === '@sveltejs/adapter-cloudflare'
    ? adapterCloudflare({ platformProxy: { remoteBindings: false, persist: false } })
    : adapterStatic(preset.mode === 'spa' ? { fallback: '200.html' } : { strict: false })
});
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

Workers AI can be enabled with `ai.provider = 'cloudflare-workers-ai'`, which emits the `AI` binding.

AI Search is opt-in. A default project keeps MiniSearch local search, and only emits AI Search bindings when `search.provider` or `ai.provider` is set to `cloudflare-ai-search`.

Cloudflare adapter 8 reads bindings from `cloudflare:workers` (`env` and `waitUntil`), rather than `event.platform`. Generated templates keep a server-only fallback alias for static/SPA builds in `vite.config.ts`; retain it when switching build modes. Use `wrangler types` when adding platform APIs.

## Local development

Template routes remain usable without Cloudflare bindings. `createConfiguredSearchResponse` uses local JSON search when AI Search is unavailable, while `createConfiguredAskResponse` returns a mock answer with local citations when no AI Search, Workers AI, or OpenAI-compatible credentials are present.

Use `.dev.vars.example` for environment names and keep real tokens out of the repository.

## Cache public SSR pages

Markdown is compiled to HTML during the Vite build, so production SSR does not parse it again. For public documentation whose entire HTML is independent of cookies, headers, user identity and request-local data, `createSvedocsHtmlCacheHandle` can also reuse the rendered page within a Worker isolate. Enable this explicitly for selected routes:

```ts title="src/hooks.server.ts"
import { building, dev, version } from '$app/env';
import { waitUntil } from 'cloudflare:workers';
import { sequence } from '@sveltejs/kit/hooks';
import { createSvedocsHtmlHandle } from 'svedocs/routes';
import { createSvedocsAgentHandle } from 'svedocs/agent';
import { createSvedocsHtmlCacheHandle } from 'svedocs/cloudflare';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import markdown from 'virtual:svedocs/markdown';

export const handle = sequence(
  createSvedocsHtmlHandle({ config, pages }),
  createSvedocsAgentHandle({ config, pages, markdown, waitUntil }),
  createSvedocsHtmlCacheHandle({
    config, pages,
    enabled: !dev && !building,
    include: (page) => page.kind === 'doc' && page.sourcePath.endsWith('.md')
      && (!page.frontmatter.layout || page.frontmatter.layout === 'docs'),
    maxAge: 3600,
    edgeCache: { version }, waitUntil
  })
);
```

The example assumes the default documentation theme and no request-dependent page overrides. Do not include personalized themes, custom layouts or components whose SSR output depends on a request. Keep authentication outside the cache, and put agent negotiation before it as shown.

The cache defaults to 60 seconds, 128 entries, 8 MiB total body bytes and 512 KiB per page. Configure `maxAge`, `maxEntries`, `maxBytes` and `maxEntryBytes` on the handle. Responses larger than the limit, or bodies that do not finish within 100 ms, are returned normally without caching. Each hit gets its own response/body, while simultaneous eligible misses in one isolate share the fill.

Without `edgeCache`, entries live only in memory. With `edgeCache: { version }`, a miss also checks a named Cloudflare Cache API cache before rendering. Cache API hits populate the bounded memory cache without extending the original expiration. Writes use `waitUntil` where available; a cache error falls back to rendering. Cache keys separate origins, paths, Accept headers and deployment versions. No public cache headers are added to the outgoing HTML.

Use `$app/env`'s build `version` and change it on **every deployment**, including theme, config and framework changes. SvelteKit defaults to a build timestamp; a custom `version.name` must also change whenever output changes. The example uses a one-hour lifetime for deployment-static documentation. Keep a shorter lifetime for public content that changes independently of deployment. A new deployment starts with a separate cache namespace in its keys.

Cookie/authorization requests, query strings, range/precondition requests, explicit revalidation, agent negotiation, SvelteKit navigation data and non-page routes bypass the cache. Private/no-store responses, cookies set during rendering, non-200 responses, `Vary`, encoded responses and nonce CSP are not stored. HEAD and ETag conditional GET work on cached HTML. Static and SPA builds always bypass this hook; keep `!building` and `!dev` to disable it during prerendering and development as well.

## Reduce Worker CPU

The Cache API skips SSR on a hit, but the Worker still executes. Its contents are local to a Cloudflare data center, so traffic in another location can miss. [Cloudflare Cache API behavior](https://developers.cloudflare.com/workers/runtime-apis/cache/).

If the site does not need request-time agent negotiation, disable `agent.negotiation` and keep the edge adapter: known pages can be prerendered while search and Ask AI retain their server endpoints. Prerendered assets are served without rendering in the Worker; Markdown twins and `llms.txt` remain available. Keep negotiation enabled when agents must receive Markdown at the same page URL.

Measure a production build with the local workerd CPU profiler, then compare production `cpuTimeMs` for the same routes and traffic mix after deployment. Network elapsed time and local profiler samples are not billed CPU time. The repository's `scripts/profile-worker-cpu.mjs` saves repeatable local profiles; `scripts/verify-rendering.mjs --ssr` checks cached and uncached HTML equality.
