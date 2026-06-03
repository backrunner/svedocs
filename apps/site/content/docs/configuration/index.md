---
title: Configuration
description: Configure site metadata, content roots, build modes, theme, search, AI, SEO, checks, Cloudflare, and i18n.
order: 4
---

# Configuration

Create `svedocs.config.ts` in the project root and export `defineConfig`. The config is loaded by the Vite plugin, CLI commands, runtime helpers, virtual modules, checks, and build-time OG generation.

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs',
    url: 'https://example.com'
  },
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages'
  },
  build: {
    mode: 'edge'
  }
});
```

## Site metadata

```ts
export default defineConfig({
  site: {
    name: 'Acme Docs',
    title: 'Acme Docs',
    description: 'Guides and API references for Acme.',
    url: 'https://docs.acme.com'
  }
});
```

`site.name` is used by the theme and metadata. `site.title` is the default document title. `site.description` is the fallback SEO description. `site.url` enables absolute canonical URLs, sitemap URLs, Open Graph URLs, and locale alternates.

## Content roots

```ts
export default defineConfig({
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages',
    include: ['**/*.{md,mdx,svx}'],
    exclude: ['**/_drafts/**']
  }
});
```

`docs` content participates in docs navigation. `pages` content becomes standalone site pages. Keep drafts outside the include pattern or exclude them explicitly.

## Build modes

```ts
export default defineConfig({
  build: {
    mode: 'edge'
  }
});
```

| Mode | Output | Use it when |
| --- | --- | --- |
| `edge` | Cloudflare-oriented SSR. | You need runtime routes for hosted search, Ask AI, or dynamic responses. |
| `static` | Fully prerendered site. | Your docs can be served as static files and runtime integrations have fallbacks. |
| `spa` | Prerendered known pages plus a static fallback. | A constrained host needs client-side fallback behavior. |

You can override the configured mode with `SVEDOCS_BUILD_MODE` or `svedocs build --mode <mode>`.

## Theme

```ts
export default defineConfig({
  theme: {
    defaultMode: 'system',
    palette: {
      accent: '#3f7df6',
      neutral: '#737373'
    },
    fonts: {
      sans: 'Inter',
      mono: 'JetBrains Mono'
    },
    radius: '4px',
    codeTheme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    code: {
      lineNumbers: true,
      wrap: false
    },
    brand: {
      label: 'Acme',
      href: '/',
      logo: '/logo.svg',
      mark: 'pixel'
    },
    nav: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/docs/reference/api' }
    ],
    social: [
      { label: 'GitHub', href: 'https://github.com/acme/docs', external: true }
    ],
    footer: {
      text: 'Built with svedocs',
      links: [{ label: 'Status', href: '/status' }]
    }
  }
});
```

Theme settings are consumed by the default components and CSS variables. Use [Theme](/docs/configuration/theme) for deeper styling details.

## Search

```ts
export default defineConfig({
  search: {
    enabled: true,
    provider: 'local',
    scope: 'current'
  }
});
```

Providers:

| Provider | Notes |
| --- | --- |
| `local` | Default MiniSearch-backed route, no external service required. |
| `algolia` | Uses server-side credentials to query an Algolia index. |
| `typesense` | Uses a REST provider for a Typesense collection. |
| `cloudflare-ai-search` | Uses Cloudflare AI Search bindings or API indexing. |

Set `search: false` to remove search from the configured theme and helpers.

## Ask AI

```ts
export default defineConfig({
  ai: {
    enabled: true,
    provider: 'mock',
    label: 'Ask AI',
    placeholder: 'Ask about these docs...',
    suggestions: [
      'How do I deploy to Cloudflare?',
      'How do I configure search?'
    ],
    maxResults: 6
  }
});
```

Providers include `mock`, `cloudflare-ai-search`, `cloudflare-workers-ai`, and `openai-compatible`. Keep `mock` or local fallback behavior during development, then add hosted credentials when the content is stable.

## SEO and OG

```ts
export default defineConfig({
  seo: {
    sitemap: true,
    robots: true,
    defaultAuthor: 'Acme',
    ogImage: {
      template: 'default',
      format: 'svg',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
```

Set `seo.ogImage = false` to disable automatic OG generation. Use SVG for portable edge/runtime output. Use PNG or Satori when you need richer build-time images and can provide fonts.

## Source links

```ts
export default defineConfig({
  source: {
    editBaseUrl: 'https://github.com/acme/docs/edit/main'
  }
});
```

The default theme can use this to show edit links. svedocs also records file timestamps as `lastUpdated` metadata.

## Checks

```ts
export default defineConfig({
  checks: {
    assets: true,
    externalLinks: false,
    translations: true
  }
});
```

Checks run through `svedocs check`. Enable external link checks deliberately because they require network access and can make CI slower.

## Cloudflare

```ts
export default defineConfig({
  cloudflare: {
    compatibilityDate: '2026-05-18',
    aiSearch: {
      binding: 'SVEDOCS_AI_SEARCH',
      instanceName: 'acme-docs',
      remote: false
    }
  }
});
```

Cloudflare settings are used by deployment helpers, generated Wrangler config, platform types, AI Search routes, and Workers AI routes.

## i18n

```ts
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    prefixDefaultLocale: false,
    locales: [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文', path: 'zh' }
    ]
  }
});
```

Locales affect route generation, sidebars, search scopes, Ask AI citations, SEO alternates, and translation checks. Set `i18n: false` for a single-locale site.

## Markdown hooks

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

Markdown hooks run at compile time during manifest generation and SVX/MDX rendering. They are not serialized into browser virtual modules.

## Configuration strategy

For production sites, configure in this order:

1. `site`, `content`, and `build`.
2. `theme` and navigation.
3. `seo`, sitemap, robots, and OG images.
4. `search` and `ai` local behavior.
5. Hosted providers and Cloudflare bindings.
6. `checks` and CI commands.

That order keeps the first docs experience working before you introduce external services.
