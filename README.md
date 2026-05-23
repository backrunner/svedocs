# svedocs

> WIP: svedocs is under active development. The first official stable release has not shipped yet, so package APIs, templates, docs, and deployment defaults may still change before launch.

svedocs is a SvelteKit-native documentation framework for edge-first docs. It keeps content, routing, rendering, search, Ask AI, SEO, Open Graph images, Cloudflare helpers, and the default theme in one integrated framework package, with a CLI for creating and operating projects.

The repository is a compact pnpm monorepo:

- `packages/svedocs`: the complete framework package.
- `packages/cli`: the `svedocs` and `create-svedocs` binaries.
- `packages/create-svedocs`: a thin compatibility entry for `npm create svedocs` and `pnpm create svedocs`; CLI implementation still lives in `packages/cli`.
- `apps/site`: the official site and live demo, kept private.

## Why svedocs

- SvelteKit-native rendering with Markdown, `.svx`, and `.mdx`-style authoring.
- One framework package instead of a split renderer/theme/search package graph.
- Cloudflare edge SSR as the default deployment path, with static and SPA builds supported.
- Content manifests, nested navigation, prev/next links, scoped search records, internal link checks, asset checks, and SEO metadata generated from the same source model.
- Runtime search and Ask AI integrations that can start locally and later move to hosted providers.
- A Tailwind CSS v4 default theme with docs navigation, ToC, command/search UI, Ask AI, version and locale controls, code block tools, dark mode, and a pixel-style homepage.

## Status

svedocs is not production-stable yet. The current repository is useful for local development, framework validation, demos, and early integration work, but the public release line is still WIP.

Current implementation includes:

- Content discovery for docs and single pages.
- Markdown/SVX/MDX-compatible compilation through Svelte.
- Page tree, sidebar ordering, locale/version scopes, and version lifecycle banners.
- Local MiniSearch, Algolia, Typesense, and Cloudflare AI Search providers.
- Ask AI providers for mock responses, Cloudflare AI Search, Workers AI, and OpenAI-compatible APIs.
- SEO metadata, sitemap, robots.txt, and SVG/PNG Open Graph image generation.
- CLI commands for create, dev, build, SSG, preview, check, search indexing, OG generation, and Cloudflare deployment scaffolding.
- Minimal, docs, and Cloudflare starter templates.

## Quick Start

Until the first official release is published, the most reliable way to try svedocs is from this workspace:

```sh
pnpm install
pnpm --filter @svedocs/site dev
```

When packages are published, project creation will be available through the CLI:

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm dev
```

Template variants:

```sh
pnpm create svedocs my-docs --template minimal
pnpm create svedocs my-docs --template docs
pnpm create svedocs my-docs --template cloudflare
```

## Project Config

Projects are configured with `svedocs.config.ts`:

```ts
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs'
  },
  theme: {
    brand: {
      label: 'My docs',
      href: '/',
      logo: '/favicon.svg'
    }
  },
  search: {
    enabled: true,
    provider: 'local'
  },
  ai: false
});
```

The Vite plugin loads `svedocs.config.ts` by default:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { svedocs } from 'svedocs/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svedocs(), sveltekit()]
});
```

## Content

svedocs reads docs and pages from the configured content roots:

```txt
content/
  docs/
    index.md
    configuration.md
  pages/
    index.md
```

Frontmatter controls title, description, order, icon, locale, version, lifecycle status, and layout selection. The same manifest powers rendering, navigation, search records, link checks, SEO, sitemap entries, and OG image routes.

## CLI

The CLI lives in `packages/cli` and exposes:

```sh
svedocs create
svedocs dev
svedocs build --mode edge
svedocs build --mode static
svedocs build --mode spa
svedocs ssg
svedocs preview
svedocs check
svedocs index
svedocs og
svedocs deploy cloudflare
```

Commands that read project state load `svedocs.config.*` before applying command-line overrides.

## Development

Common workspace commands:

```sh
pnpm install
pnpm build
pnpm check
pnpm test
pnpm lint
pnpm pack:dry-run
```

Focused framework validation:

```sh
pnpm --filter svedocs check
pnpm --filter svedocs test
pnpm --filter svedocs build
```

Focused CLI validation:

```sh
pnpm --filter @svedocs/cli check
pnpm --filter @svedocs/cli test
pnpm --filter @svedocs/cli build
```

Official site validation:

```sh
pnpm --filter @svedocs/site check
pnpm --filter @svedocs/site build
SVEDOCS_BUILD_MODE=static pnpm --filter @svedocs/site build
SVEDOCS_BUILD_MODE=spa pnpm --filter @svedocs/site build
```

Before publishing packages, run:

```sh
pnpm release:check
```

Generated templates have a heavier install/build smoke test:

```sh
pnpm test:templates
```

## Package Boundaries

Public imports are intentionally small and stable:

- `svedocs/config`: config schema, `defineConfig`, and config loading.
- `svedocs/core`: content model APIs, manifests, navigation, checks, search records, and shared types.
- `svedocs/vite`: Vite plugin, virtual modules, and content refresh.
- `svedocs/theme`: default Svelte theme components.
- `svedocs/theme/styles.css`: Tailwind CSS v4 theme styles.
- `svedocs/cloudflare`: build presets, wrangler helpers, and binding types.
- `svedocs/search`: local and hosted search providers plus indexing sync.
- `svedocs/ai`: Ask AI providers, SSE responses, and rate limiting.
- `svedocs/og`: SEO metadata, sitemap/robots, and OG image rendering.
- `svedocs/svelte`: Svelte-compatible content preprocessing helpers.

The `create-svedocs` package is only a package-manager compatibility shim and must continue to delegate to `@svedocs/cli`.

## Publishing

Publishable packages keep MIT license metadata, package `files` and `exports`, and:

```json
{
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

The official release has not been announced or shipped yet. Treat all npm publishing and compatibility work as release preparation until that changes.

The product and technical plans live in `.agents/`.
