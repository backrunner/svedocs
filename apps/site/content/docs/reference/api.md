---
title: Public API
description: Stable public imports exposed by the integrated svedocs framework package.
order: 3
---

# Public API

svedocs keeps public entry files small. Internal capabilities live in subdirectories, but users should import from stable package paths.

## Config

```ts
import { defineConfig, loadSvedocsConfig } from 'svedocs/config';
```

Use `defineConfig` for typed configuration and `loadSvedocsConfig` for resolved defaults.

## Vite

```ts
import { svedocs } from 'svedocs/vite';
```

The plugin provides virtual modules, content refresh, MDX/SVX component compilation, injected authoring components, and named layout registration.

Compile-time Markdown hooks live in `svedocs.config.ts`:

```ts
export default defineConfig({
  markdown: {
    remarkPlugins: [],
    rehypePlugins: [],
    shiki: {
      transformers: []
    }
  }
});
```

These hooks are used by manifest compilation and Svelte-compatible `.svx/.mdx` rendering, but are not serialized into browser virtual modules.

Virtual modules:

| Module | Value |
| --- | --- |
| `virtual:svedocs/config` | Resolved config |
| `virtual:svedocs/pages` | Page manifest |
| `virtual:svedocs/tree` | Sidebar tree |
| `virtual:svedocs/search` | Search records |
| `virtual:svedocs/components` | Compiled `.svx/.mdx` components |
| `virtual:svedocs/layouts` | Registered custom layouts |

## Core

```ts
import {
  loadSvedocsContent,
  createPageTree,
  createSearchRecords,
  checkSvedocsContent
} from 'svedocs/core';
```

Core APIs expose the manifest, content model, navigation, links, checks, and search records. Page metadata includes locale scope for translated docs and content lifecycle fields for warnings.

## Theme

```ts
import { DocsApp, RootLayout, DocsLayout, DocPage, HomePage } from 'svedocs/theme';
import 'svedocs/theme/styles.css';
```

Use `DocsApp` for the complete route shell or compose lower-level components for custom apps.

## Cloudflare

```ts
import { createCloudflarePreset, createWranglerJsonc, createCloudflareEnvDts } from 'svedocs/cloudflare';
```

These helpers align SvelteKit build modes, `wrangler.toml` or `wrangler.jsonc`, and platform binding types.

## Search and AI

```ts
import { createConfiguredSearchResponse, createSearchResponse, searchRecords } from 'svedocs/search';
import { createConfiguredAskResponse, createAskResponse, createMemoryRateLimiter } from 'svedocs/ai';
```

Search and Ask AI are built-in framework capabilities with local, Algolia, Typesense, Cloudflare-oriented, and OpenAI-compatible provider paths. Local search accepts locale and kind scope filters.

Use the configured response helpers in generated route handlers. Import lower-level providers such as `createAlgoliaSearchProvider`, `createTypesenseSearchProvider`, `createCloudflareAiSearchProvider`, `createWorkersAiProvider`, or `createOpenAiCompatibleProvider` only for custom routing or custom provider selection.

## OG

```ts
import {
  createPageMetadata,
  createPageAlternates,
  createSitemapXml,
  createRobotsTxt,
  createPageOgImageResponse,
  createOgImageInput,
  createOgImage
} from 'svedocs/og';
```

Use these APIs for custom route handlers, custom layouts, and build-time OG generation.

