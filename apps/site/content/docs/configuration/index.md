---
title: Configuration
description: Configure site metadata, content roots, build modes, theme, search, AI, SEO, checks, Cloudflare, and i18n.
order: 4
---

# Configuration

Most site behavior is configured in `svedocs.config.ts` at the project root. Export `defineConfig` from this file so the Vite plugin, CLI, runtime utilities, checks, and OG image generator all use the same settings.

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

The theme displays `site.name`, while `site.title` becomes the default document title. `site.description` is used when a page has no description of its own. Set `site.url` on public sites so canonical links, sitemap entries, Open Graph URLs, and language alternates can be absolute.

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
| `static` | Fully prerendered site. | Your docs can be served as static files and runtime features can use local alternatives. |
| `spa` | Prerendered known pages plus a static fallback page. | A constrained host needs client-side routing. |

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
      { label: 'Docs', labelKey: 'nav.docs', href: '/docs' },
      { label: 'API', labelKey: 'nav.api', href: '/docs/reference/api' }
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

Available providers:

| Provider | Notes |
| --- | --- |
| `local` | Default MiniSearch-backed route, no external service required. |
| `algolia` | Uses server-side credentials to query an Algolia index. |
| `typesense` | Queries a Typesense collection over REST. |
| `cloudflare-ai-search` | Uses Cloudflare AI Search bindings or API indexing. |

Set `search: false` to remove search from the theme and its related runtime utilities.

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

Choose from `mock`, `cloudflare-ai-search`, `cloudflare-workers-ai`, and `openai-compatible`. The `mock` provider works without credentials and is useful while writing the site. Connect a hosted service once the content and question flow are ready to test with real responses.

## SEO and OG

```ts
export default defineConfig({
  seo: {
    sitemap: true,
    robots: true,
    defaultAuthor: 'Acme',
    head: {
      meta: [
        { name: 'google-site-verification', content: 'verification-token' }
      ],
      links: [
        { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml', title: 'RSS' }
      ],
      jsonLd: [
        { '@type': 'Organization', name: 'Acme' }
      ]
    },
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

`seo.head` is for serializable head additions that should appear on every page, such as verification meta tags, feed links, preload links, and organization-level JSON-LD. Page frontmatter can also define `head` for page-specific additions.

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

Run these checks with `svedocs check`. External link checks need network access and can slow down CI, so they are disabled by default.

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

These settings feed the deployment utilities, generated Wrangler config, platform types, AI Search routes, and Workers AI routes.

## i18n

```ts
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    prefixDefaultLocale: false,
    locales: [
      { code: 'en', label: 'English', hreflang: 'en', dir: 'ltr' },
      { code: 'zh', label: '中文', path: 'zh', hreflang: 'zh-CN', dir: 'ltr' }
    ],
    messages: {
      zh: {
        'search.placeholder': '搜索文档',
        'ask.label': '问 AI',
        'home.primaryAction': '阅读文档'
      }
    }
  }
});
```

Locale settings control routes, sidebars, search filters, Ask AI citations, SEO alternates, and translation checks. `hreflang` is used in `<link rel="alternate">`, sitemap alternates, Open Graph locale tags, and JSON-LD `inLanguage`. Set `dir` to `rtl` for right-to-left languages.

Use `i18n.messages` to translate the interface around your content, including navigation, search, Ask AI, the table of contents, article actions, code-copy labels, landing-page cards, errors, and footer text. English is the base catalog, even when `i18n: false`, so each locale only needs to override the messages it changes.

See [Internationalization](/docs/configuration/i18n) for content layout, route mapping, custom message keys, locale-aware links, SEO behavior, and translation checks.

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

Markdown hooks run at compile time while svedocs builds the page list and renders SVX or MDX. They are never serialized into browser virtual modules.

## A practical setup order

For a new production site, this order keeps each step easy to verify:

1. `site`, `content`, and `build`.
2. `theme` and navigation.
3. `seo`, sitemap, robots, and OG images.
4. `search` and `ai` local behavior.
5. Hosted services and Cloudflare bindings.
6. `checks` and CI commands.

At step four, the site is already usable locally. The remaining steps prepare it for external services and CI.
