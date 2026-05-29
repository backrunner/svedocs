---
title: Quick Start
description: Start a svedocs site in minutes and learn the core pieces of the framework.
order: 1
---

# Quick Start

svedocs is a SvelteKit-native documentation framework for docs sites that want a single, integrated stack: content loading, theme, search, Ask AI, SEO, OG images, and Cloudflare deployment helpers.

## Install

```sh
pnpm add svedocs
pnpm add -D svedocs-cli
```

## Create a site

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

## What you get

| Capability | Default |
| --- | --- |
| Content | Markdown, SVX/MDX-style authoring, frontmatter, code metadata, and scoped navigation |
| Theme | Tailwind CSS v4 theme tokens, light and dark modes, and layout components |
| Deploy | Cloudflare edge SSR, static output, and SPA fallback |
| Search | Local MiniSearch, Algolia, Typesense, and Cloudflare AI Search |
| Ask AI | Mock, Cloudflare AI Search, Workers AI, OpenAI-compatible providers, citations, and rate limits |
| SEO | Metadata, JSON-LD, sitemap, robots, and OG assets |

## Next steps

- Read [Installation](/docs/installation) if you are wiring svedocs into an existing SvelteKit app.
- Read [Writing](/docs/writing) to understand the content model and authoring flow.
- Read [Configuration](/docs/configuration) for site metadata, theme, and build settings.
- Read [Integrations](/docs/integrations) for search, AI, deployment, and SEO helpers.

## FAQ

- New project? Use `pnpm create svedocs`.
- Existing project? Start with `pnpm add svedocs` and `pnpm add -D svedocs-cli`.
- Need a quick demo? The CLI can scaffold a full docs site with local search and OG routes.
