---
title: Cloudflare
description: Deploy svedocs to Cloudflare Pages with edge SSR, static output, Workers AI, and AI Search bindings.
order: 7
---

# Cloudflare

Cloudflare edge SSR is the default deployment path for svedocs. Static output is also first-class. SPA output is supported for hosts that need a client-side fallback while still serving prerendered known pages.

## Build Preset

```ts title="svelte.config.js"
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { createCloudflarePreset } from 'svedocs/cloudflare';

const preset = createCloudflarePreset(process.env.SVEDOCS_BUILD_MODE ?? 'edge');

export default {
  kit: {
    adapter: preset.adapter === '@sveltejs/adapter-cloudflare'
      ? adapterCloudflare({ platformProxy: { remoteBindings: false } })
      : adapterStatic({ fallback: preset.mode === 'spa' ? '200.html' : undefined })
  }
};
```

## Wrangler

`svedocs deploy cloudflare --write` creates a baseline `wrangler.toml` from your resolved config.

```toml title="wrangler.toml"
name = "my-docs"
compatibility_date = "2026-05-18"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[ai_search]]
binding = "SVEDOCS_AI_SEARCH"
instance_name = "svedocs"
```

For AI Search namespaces, configure `cloudflare.aiSearch.namespace`; svedocs will emit `[[ai_search_namespaces]]` instead of `[[ai_search]]`.

`platformProxy.remoteBindings` is disabled in the local adapter config so edge builds and prerendering do not require a Cloudflare account. `cloudflare.aiSearch.remote` also defaults to `false`; set both intentionally only when you want local development to talk to remote Cloudflare resources.

## Runtime Types

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

## Local Development

Cloudflare-backed routes should always keep local fallback behavior. The template search route uses `createConfiguredSearchResponse`, so Cloudflare AI Search falls back to local JSON search when no binding is present. The Ask AI route uses `createConfiguredAskResponse`, so missing AI Search, Workers AI, or OpenAI-compatible credentials fall back to the mock provider with local citations.

Use `.dev.vars.example` for environment names and keep real tokens out of the repository.
