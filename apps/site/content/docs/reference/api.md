---
title: Public API
description: Stable public imports exposed by the integrated svedocs framework package.
order: 3
---

# Public API

Import public APIs from the package paths shown below. Their entry files stay small and stable even when the implementation moves between internal directories.

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

These hooks run while svedocs builds the page list and renders Svelte-compatible `.svx/.mdx` files. They are not serialized into browser virtual modules.

Virtual modules:

| Module | Value |
| --- | --- |
| `virtual:svedocs/config` | Resolved config |
| `virtual:svedocs/pages` | Complete page list |
| `virtual:svedocs/page-index` | Lightweight page index for client route matching |
| `virtual:svedocs/page-loaders` | Dynamic loaders for full per-page data |
| `virtual:svedocs/tree` | Sidebar tree |
| `virtual:svedocs/search` | Search records |
| `virtual:svedocs/search-loader` | Dynamic loader for client-side search records |
| `virtual:svedocs/components` | Compiled `.svx/.mdx` components |
| `virtual:svedocs/layouts` | Registered custom layouts |
| `virtual:svedocs/theme-components` | Registered theme component overrides |

## Core

```ts
import {
  loadSvedocsContent,
  createPageTree,
  createSearchRecords,
  checkSvedocsContent
} from 'svedocs/core';
import { resolveSvedocsPageRoute, resolveSvedocsHref } from 'svedocs/routes';
```

Core APIs cover content loading, navigation, links, checks, and search records. The browser-safe `svedocs/routes` entry exposes `resolveSvedocsPageRoute` for canonical route loading and default-locale redirects, plus `resolveSvedocsHref` for applying the same locale rules to links.

## Theme

```ts
import {
  DocsApp,
  RootLayout,
  LayoutShell,
  DocsLayout,
  DocsShell,
  DocPage,
  Article,
  PageLayout,
  PageShell,
  ErrorPage,
  RenderError,
  Navbar,
  TableOfContents,
  Footer,
  PageTools,
  HomePage,
  FormField,
  Input,
  Select,
  Textarea,
  Checkbox,
  Button,
  LocalizedLink
} from 'svedocs/theme';
import 'svedocs/theme/styles.css';
import 'svedocs/theme/base.css';
import { createSearchController, createAskAiController } from 'svedocs/theme/headless';
import type { SvedocsThemeComponentMap, SvedocsNavbarProps } from 'svedocs/theme/types';
```

Use `DocsApp` for the complete route shell or compose lower-level components for custom apps.
Use the form controls in custom pages and layouts when you want project UI to inherit the default svedocs theme.
Use `themeComponents` plus the headless controllers when building a fully custom theme without the default stylesheet. See [Components](/docs/reference/theme-components) for the per-component props.

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

Search and Ask AI support local, Algolia, Typesense, Cloudflare, and OpenAI-compatible services. Local search can filter by locale and content kind.

Generated route handlers should use the configured response utilities. Import lower-level providers such as `createAlgoliaSearchProvider`, `createTypesenseSearchProvider`, `createCloudflareAiSearchProvider`, `createWorkersAiProvider`, or `createOpenAiCompatibleProvider` only when you need custom routing or service selection.

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
