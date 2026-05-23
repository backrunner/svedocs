---
title: Configuration
description: Configure site metadata, content roots, build modes, search, AI, and SEO.
---

# Configuration

Create `svedocs.config.ts` at the project root.

```ts
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs'
  },
  build: {
    mode: 'edge'
  },
  source: {
    editBaseUrl: 'https://github.com/acme/docs/edit/main'
  },
  theme: {
    nav: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/docs/api' }
    ],
    radius: '4px',
    codeTheme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
});
```

## Build modes

- `edge` uses Cloudflare-oriented SSR.
- `static` prerenders the site.
- `spa` prerenders known pages and adds a static fallback; server-only Search/Ask AI providers use local fallback behavior on static hosts.

## Search and AI

Search and Ask AI are integrated capabilities. They can be disabled for simple sites or connected to Cloudflare AI Search, Algolia, Typesense, Workers AI, or an OpenAI-compatible provider for production.

The default app exposes `/api/search` and `/api/ask` endpoints powered by `createConfiguredSearchResponse` and `createConfiguredAskResponse`. Switching `search.provider` or `ai.provider` is usually enough; the runtime route reads server env and Cloudflare bindings, then falls back to local search or mock Ask AI when credentials are absent.

`ai` is disabled by default. Setting `ai.provider` enables Ask AI unless `enabled: false` is explicitly set.

`search.scope` and `ai.scope` default to `current`, so locale and version aware sites search the active documentation scope first. Set either value to `all` when a site should search every locale and version from the same dialog.

## Locales and versions

Locale and version scopes are part of the content model, so route generation, scoped sidebar navigation, SEO alternates, Ask AI citations, and search records stay aligned.

```ts title="svedocs.config.ts"
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文' }
    ]
  },
  versions: {
    current: 'v1',
    items: [
      { name: 'v1', label: 'Latest' },
      {
        name: 'v0',
        label: 'Legacy',
        status: 'archived',
        banner: 'Legacy docs are frozen. Use Latest for current APIs.'
      }
    ]
  },
  checks: {
    translations: true
  }
});
```

Version items can be marked as `current`, `next`, `deprecated`, or `archived`. Deprecated and archived docs get a default theme banner, and `checks.translations` reports missing locale pages without changing routing behavior.

## Markdown extensions

`markdown.remarkPlugins` and `markdown.rehypePlugins` run during manifest compilation and Svelte-compatible SVX/MDX rendering. These are compile-time hooks, so plugin functions are not serialized into browser virtual modules.

```ts title="svedocs.config.ts"
export default defineConfig({
  markdown: {
    remarkPlugins: [],
    rehypePlugins: []
  }
});
```

## Source metadata

Set `source.editBaseUrl` to show edit links in the default theme. svedocs also records `lastUpdated` from the source file timestamp.
