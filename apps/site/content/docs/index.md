---
title: Introduction
description: Start building documentation sites with svedocs.
---

# Introduction

svedocs is a SvelteKit-native documentation framework. It gives projects a complete docs foundation without asking users to assemble many optional rendering packages.

## Install

```sh
pnpm add svedocs
pnpm add -D @svedocs/cli
```

## Create a site

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

## Built in

| Capability | Default |
| --- | --- |
| Content | Markdown, MDX-style authoring, frontmatter |
| Theme | Tailwind CSS v4 with light and dark modes |
| Deploy | Cloudflare edge-first |
| Search | MiniSearch local search, Algolia, Typesense, and Cloudflare AI Search |
| Ask AI | Mock, Cloudflare AI Search, Workers AI, OpenAI-compatible providers, citations, and rate limits |
| SEO | Metadata, JSON-LD, sitemap, robots, and OG assets |

## Framework shape

svedocs ships as one integrated framework package plus one CLI package. The content model, theme, Search/Ask AI, SEO, OG, and Cloudflare helpers live inside `svedocs`.

## Next steps

- Configure the site in [Configuration](/docs/configuration).
- Author content with [Content](/docs/content).
- Deploy with [Cloudflare](/docs/cloudflare).
- Wire production search with [Search and Ask AI](/docs/search-ai).
