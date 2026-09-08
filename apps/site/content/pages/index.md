---
title: svedocs
seoTitle: svedocs — SvelteKit documentation for Cloudflare and static hosting
description: Build a documentation site that fits your project with SvelteKit, custom themes, Markdown, search, and Agent Skills. Deploy to Cloudflare or static hosting.
image: /brand/og-home-en.png
imageAlt: svedocs — Your docs. Your design. A SvelteKit documentation framework with custom themes and Agent Skills.
imageWidth: 1200
imageHeight: 630
imageType: image/png
head:
  jsonLd:
    - '@context': https://schema.org
      '@type': WebSite
      '@id': https://svedocs.pwp.sh/#website
      name: svedocs
      url: https://svedocs.pwp.sh/
      inLanguage: en
      description: A SvelteKit documentation framework with custom themes, search, and Agent Skills for Cloudflare and static hosting.
      publisher:
        '@id': https://svedocs.pwp.sh/#organization
layout: site-home
---

## Start here

1. Create a site with `pnpm create svedocs my-docs`.
2. Open `/docs` and read the [Quick Start](/docs).
3. Move through [Installation](/docs/installation), [Writing](/docs/writing), [Configuration](/docs/configuration), [Integrations](/docs/integrations), and [Reference](/docs/reference) as the project grows.

## Included

- Content loading, filtered navigation, and search records.
- Tailwind CSS v4 theme tokens and the default docs shell.
- Search, Ask AI, SEO, OG images, and Cloudflare deployment tools.

## Build with an agent

Open the project you want to document in your coding agent, then [copy the project prompt](#build-with-an-agent) or read the [complete plain-text prompt](https://svedocs.pwp.sh/prompts/build-docs.en.txt).

The prompt installs the [official svedocs skills](https://github.com/backrunner/svedocs/tree/main/skills), asks your agent to inspect the code and visual identity, and guides it through a custom theme, landing page, real documentation, SEO, and browser validation. You can append your preferred site directory, language, public URL, or hosting target before sending it.

## Typical flow

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

Start with a small docs tree: install the package, write a few pages, and configure the site. Add hosted search or AI once there is enough content to judge the results.
