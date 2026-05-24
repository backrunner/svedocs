---
title: svedocs
description: Build edge-first SvelteKit documentation sites with one integrated framework package.
layout: home
---

## Start here

1. Create a site with `pnpm create svedocs my-docs`.
2. Open `/docs` and read the [Quick Start](/docs).
3. Move through [Installation](/docs/installation), [Writing](/docs/writing), [Configuration](/docs/configuration), [Integrations](/docs/integrations), and [Reference](/docs/reference) as the project grows.

## What ships first

- Content loading, scoped navigation, and search records.
- Tailwind CSS v4 theme tokens and the default docs shell.
- Search, Ask AI, SEO, OG, and Cloudflare deployment helpers in one package.

## Typical flow

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

Then keep the docs tree small at first: install the package, write pages, wire config, and only add hosted search or AI once the content itself feels stable.
