---
title: Configuration
description: Configure site metadata, content roots, build modes, search, AI, and SEO.
order: 4
---

# Configuration

Create `svedocs.config.ts` at the project root.

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs'
  },
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages'
  },
  build: {
    mode: 'edge'
  },
  theme: {
    nav: [
      { label: 'Docs', href: '/docs' },
      { label: 'Theme', href: '/docs/configuration/theme' },
      { label: 'API', href: '/docs/reference/api' }
    ],
    radius: '4px'
  }
});
```

## Build modes

- `edge` uses Cloudflare-oriented SSR.
- `static` prerenders the site.
- `spa` prerenders known pages and adds a static fallback for constrained hosts.

## Search and AI

Search and Ask AI are integrated capabilities. They can be disabled for simple sites or connected to Cloudflare AI Search, Algolia, Typesense, Workers AI, or an OpenAI-compatible provider for production.

The runtime routes use `createConfiguredSearchResponse` and `createConfiguredAskResponse`, so the local fallback stays available when credentials or bindings are missing.

## Locales

Locale scopes are part of the content model, so route generation, sidebar navigation, SEO alternates, Ask AI citations, and search records stay aligned.

```ts title="svedocs.config.ts"
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文' }
    ]
  }
});
```

## Markdown hooks

`markdown.remarkPlugins` and `markdown.rehypePlugins` run during manifest compilation and Svelte-compatible SVX/MDX rendering. These are compile-time hooks, so plugin functions are not serialized into browser virtual modules.

## Source metadata

Set `source.editBaseUrl` to show edit links in the default theme. svedocs also records `lastUpdated` from the source file timestamp.

## More settings

- [Theme](/docs/configuration/theme)
- [Writing](/docs/writing)
- [Integrations](/docs/integrations)
- [Reference](/docs/reference)
