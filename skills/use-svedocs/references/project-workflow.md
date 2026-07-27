# Project workflow

- [Standard project files](#standard-project-files)
- [Create or install](#create-or-install)
- [Content model](#content-model)
- [Agent interface](#agent-interface)
- [CLI](#cli)
- [Verification](#verification)

## Standard project files

Generated projects keep these responsibilities separate:

| File | Responsibility |
| --- | --- |
| `svedocs.config.ts` | Serializable user configuration |
| `vite.config.ts` | `svedocs` Vite plugin, authoring components, layouts, theme component paths |
| `svelte.config.js` | Svedocs extensions/preprocessor and build-mode adapter |
| `src/app.d.ts` | Type declarations for generated virtual modules |
| `src/routes/+layout.svelte` | Import global theme CSS once |
| `src/routes/+layout.ts` | SSR and trailing-slash helpers |
| `src/routes/+page.ts` | Load the standalone home page |
| `src/routes/+page.svelte` | Render home through `DocsApp` |
| `src/routes/[...path]/+page.ts` | Resolve pages, redirects, route entries, and lazy content |
| `src/routes/[...path]/+page.svelte` | Render docs and standalone pages through `DocsApp` |
| `content/docs` | Documentation tree rooted at `/docs` |
| `content/pages` | Standalone pages rooted at `/` |

`docs` and `cloudflare` templates also include search, Ask AI, sitemap, robots, optional RSS, OG routes, and the agent interface (per-page markdown twins, `/llms.txt`, `/llms-full.txt`). Copy the closest template instead of inventing route plumbing.

Existing explicit SvelteKit routes can coexist with the docs catch-all. If the application already owns `[...path]`, merge resolution behavior or mount docs below a non-conflicting route; do not add a second catch-all. Preserve an existing `/` unless svedocs should own the product homepage.

## Create or install

Create a project:

```sh
pnpm create svedocs my-docs --template docs
cd my-docs
pnpm install
pnpm dev
```

Templates:

| Template | Choose when |
| --- | --- |
| `minimal` | Learn or embed a small local docs site |
| `docs` | Build a normal product docs site with local search and runtime route examples |
| `cloudflare` | Deploy edge-first with Wrangler and Cloudflare binding examples |

Add to an existing SvelteKit app:

```sh
pnpm add svedocs
pnpm add -D svedocs-cli
```

Use `defineConfig` from `svedocs/config`, register `svedocs({ config })` before `sveltekit()`, and import `svedocs/theme/styles.css` once. Keep Tailwind CSS v4 through `@tailwindcss/vite` when using the bundled theme.

Merge these Svelte settings with existing extensions and preprocessors:

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import {
  svedocsPreprocess,
  svedocsSvelteExtensions
} from 'svedocs/svelte';

export default {
  extensions: svedocsSvelteExtensions,
  preprocess: [vitePreprocess(), svedocsPreprocess()]
};
```

Use `@sveltejs/adapter-static` for static/SPA output and `@sveltejs/adapter-cloudflare` for the generated edge setup. Keep `src/app.d.ts` virtual-module declarations from the matching template.

## Content model

Default route mapping:

| Source | Route |
| --- | --- |
| `content/docs/index.md` | `/docs` |
| `content/docs/guides/deploy.md` | `/docs/guides/deploy` |
| `content/pages/index.md` | `/` |
| `content/pages/changelog.md` | `/changelog` |

Use `.md`, `.mdx`, or `.svx`. Start public pages with:

```md
---
title: Deploy
description: Deploy the application to production.
order: 2
---
```

Useful frontmatter includes `navTitle`, `slug`, `hidden`, `collapsed`, `section`, `canonical`, `image`, `keywords`, `author`, publication/update dates, and `layout`. Use `slug` to replace the final route segment with a single path segment (reserved values `index`, `.`, `..` and values with slashes or whitespace are rejected); translations pair by file path, so each locale may use its own slug. Use `index.md` for section roots. Keep internal links route-based and give code blocks language and file metadata.

The Vite plugin generates:

- page index and lazy page loaders;
- compiled authoring components and named layouts;
- scoped navigation tree and search records;
- resolved config and registered theme components.

Consume those virtual modules through the generated route pattern. Do not recreate discovery or navigation by scanning content in Svelte components.

For static local search, `virtual:svedocs/search-loader` is sufficient and no `/api/search` route is required. Hosted providers use the generated edge endpoint; static and SPA builds must retain their local fallback. The same distinction applies to Ask AI runtime routes.

## Agent interface

`svedocs/agent` exposes the machine-readable surface:

- Markdown twins: each page serves raw markdown at `<route>/index.md` via `createPageMarkdownResponse`; raw markdown also ships to apps as `virtual:svedocs/markdown`.
- `/llms.txt` and `/llms-full.txt` via `createLlmsTxtResponse` and `createLlmsFullTxtResponse`.
- `createSvedocsAgentHandle` in `hooks.server.ts` negotiates markdown for agent user-agents and `Accept` headers. Negotiation is edge-only and uses content-versioned cache keys; negotiated responses stay `private`.

When agent negotiation is enabled, `svedocsPagePrerender()` returns `false` because prerendered pages bypass the server hook. Static and SPA builds keep the markdown-twin and llms.txt routes but skip negotiation.

## CLI

| Command | Purpose |
| --- | --- |
| `svedocs dev` | Run development |
| `svedocs preview` | Preview a production build |
| `svedocs build --mode edge` | Build edge SSR |
| `svedocs ssg` | Build static output |
| `svedocs build --mode spa` | Build known pages plus SPA fallback |
| `svedocs check --strict` | Validate content and fail on warnings |
| `svedocs check --translations` | Check locale coverage |
| `svedocs index` | Export or upload search records |
| `svedocs og` | Generate OG assets |
| `svedocs deploy cloudflare setup` | Preview Cloudflare files |
| `svedocs upgrade` | Upgrade framework and CLI together |

Commands that read project state load `svedocs.config.*` before applying CLI flags.

## Verification

For a consumer site:

```sh
svedocs check --strict
pnpm check
pnpm build
```

For content work, also inspect links, anchors, assets, search records, and frontmatter. For integrations, exercise the matching endpoint and its local fallback. For framework source changes, follow repository-specific checks and validate generated templates when exports, metadata, or scaffolding change.

`build.mode` supplies the default. `SVEDOCS_BUILD_MODE` or `svedocs build --mode` overrides it for one build. Keep the selected adapter, `svedocsPagePrerender()`, catch-all `entries()`, and preview behavior aligned. Smoke-test direct refreshes and existing non-doc routes after integrating with an established app.
