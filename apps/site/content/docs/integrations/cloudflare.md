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

The local adapter disables `platformProxy.remoteBindings`, so edge builds and prerendering do not require a Cloudflare account. It also disables `platformProxy.persist` to avoid Miniflare state locks after repeated dev-server restarts. `cloudflare.aiSearch.remote` defaults to `false`; enable it only when local development needs to access Cloudflare resources.

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
