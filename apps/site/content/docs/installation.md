---
title: Installation
description: Install svedocs in a new project, wire it into an existing SvelteKit app, and keep the framework dependencies current.
order: 2
---

# Installation

You can generate a new project or add svedocs to an existing SvelteKit app. For a new site, the template is usually faster because it already contains the routes, config, content folders, and server endpoints.

## Requirements

- Node.js 20.19 or newer.
- A SvelteKit project using ESM.
- pnpm, npm, yarn, or bun. The templates default to pnpm because the repository itself uses pnpm.

## Create a new project

```sh
pnpm create svedocs my-docs --template docs
cd my-docs
pnpm install
pnpm dev
```

The `create-svedocs` package forwards the command to `svedocs-cli`. The CLI uses its bundled template, aligns framework and CLI dependency versions, and updates the project name and package manager. Pass `--channel beta` to build from beta packages, or `--channel latest` to prefer latest with automatic beta fallback. Pass `--install` when you also want it to install dependencies.

Every template also includes the current svedocs Agent Skills under `.agents/skills`. Codex discovers them as repository-scoped skills and can use the project-specific setup, configuration, theme, landing, and localization guidance immediately.

Template dependencies are normal registry dependencies:

```json title="package.json"
{
  "dependencies": {
    "svedocs": "latest"
  },
  "devDependencies": {
    "svedocs-cli": "latest"
  }
}
```

With `--install`, your chosen package manager installs these packages from its configured registry. No framework source is copied into the project.

## Choose a template

```sh
pnpm create svedocs my-docs --template minimal
pnpm create svedocs my-docs --template docs
pnpm create svedocs my-docs --template cloudflare
```

| Template | Included routes | Best for |
| --- | --- | --- |
| `minimal` | Docs shell, sitemap, robots, and optional RSS routes. | Learning the basics or embedding docs into an existing app. |
| `docs` | Search, Ask AI fallback, sitemap, robots, optional RSS, and OG routes. | Most product documentation sites. |
| `cloudflare` | Everything in `docs`, plus Wrangler config and Cloudflare binding examples. | Cloudflare Pages and edge-first projects. |

Remote template behavior can be controlled with environment variables:

| Variable | Purpose |
| --- | --- |
| `SVEDOCS_TEMPLATE_SOURCE=bundled` | Force the CLI-bundled template copy. |
| `SVEDOCS_TEMPLATE_SOURCE=github` | Require GitHub and fail instead of falling back. |
| `SVEDOCS_TEMPLATE_REF=<branch|tag|sha>` | Pin a remote template version. |
| `SVEDOCS_TEMPLATE_REPOSITORY=<owner/repo>` | Fetch templates from a different repository. |

## Add svedocs to an existing app

Install the framework and CLI:

```sh
pnpm add svedocs
pnpm add -D svedocs-cli @tailwindcss/vite tailwindcss
```

Create `svedocs.config.ts`:

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation for my product',
    url: 'https://example.com'
  },
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages'
  },
  ai: false
});
```

Register the Vite plugin:

```ts title="vite.config.ts"
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

export default defineConfig({
  plugins: [svedocs({ config: svedocsConfig }), tailwindcss(), sveltekit()]
});
```

Import the default theme CSS once in the root layout:

```svelte title="src/routes/+layout.svelte"
<script lang="ts">
  import 'svedocs/theme/styles.css';
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
```

Keep your existing SvelteKit plugins and layout content when merging these changes. This minimal setup enables local search and disables Ask AI until you add its runtime route.

Enable the Svelte content extensions and preprocessors in `svelte.config.js`. This example uses `adapter-auto`; keep your existing adapter and other `kit` settings if the application already has a deployment target. Install `@sveltejs/adapter-auto` as a dev dependency if you use this example.

```js title="svelte.config.js"
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svedocsPreprocess, svedocsSvelteExtensions } from 'svedocs/svelte';

export default {
  extensions: svedocsSvelteExtensions,
  preprocess: [vitePreprocess(), svedocsPreprocess()],
  kit: { adapter: adapter() }
};
```

### Load the current document

Create the catch-all route below. It resolves localized URLs, returns a real 404 for unknown documents, and loads only the current page and its content component. Existing SvelteKit routes take precedence over the catch-all.

```ts title="src/routes/[...path]/+page.ts"
import componentLoaders from 'virtual:svedocs/component-loaders';
import layoutLoaders from 'virtual:svedocs/layout-loaders';
import { loadSvedocsPage } from 'svedocs/routes';
import { error, redirect } from '@sveltejs/kit';
import config from 'virtual:svedocs/config';
import pageLoaders from 'virtual:svedocs/page-loaders';
import pages from 'virtual:svedocs/page-index';
import tree from 'virtual:svedocs/tree';
import { svedocsPagePrerender } from 'svedocs/cloudflare';
import type { SvedocsPage } from 'svedocs/core';
import { createSvedocsRouteEntries, resolveSvedocsPageRoute } from 'svedocs/routes';
import type { PageLoad } from './$types';

export const prerender = svedocsPagePrerender(undefined, config);

export function entries() {
  return createSvedocsRouteEntries(pages, config)
    .map((path) => ({ path: path.replace(/^\//, '') }));
}

export const load: PageLoad = async ({ params }) => {
  const routePath = `/${params.path ?? ''}`.replace(/\/$/, '') || '/';
  const resolution = resolveSvedocsPageRoute(routePath, pages, config);
  if (resolution.status === 'redirect') redirect(307, resolution.location);
  if (resolution.status === 'missing') error(404, `No page found for ${routePath}`);
  const pageIndex = resolution.page;
  const loaded = await loadSvedocsPage(pageIndex, { pages: pageLoaders, components: componentLoaders, layouts: layoutLoaders });
  const { page } = loaded;
  return { ...loaded, pages: mergeCurrentPage(pages, page), search: [], tree, config };
};

function mergeCurrentPage(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
  return pages.map((page) => page.id === current.id ? current : page);
}
```

### Render the document

Pass the loaded page and theme components to `DocsApp`. The search index loads when needed.

```svelte title="src/routes/[...path]/+page.svelte"
<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import themeComponents from 'virtual:svedocs/theme-components';
  import loadSearch from 'virtual:svedocs/search-loader';
  export let data;
</script>

<DocsApp page={data.page} pages={data.pages} tree={data.tree} search={data.search} config={data.config} content={data.content} layout={data.layout} {themeComponents} {loadSearch} />
```

Add `src/app.d.ts` if the project does not already reference the virtual module types:

```ts title="src/app.d.ts"
/// <reference types="svedocs/virtual" />
```

The route now serves content under `/docs` and standalone content pages that do not overlap existing routes. The app can retain its current home page. Add [search and Ask AI endpoints](/docs/integrations/search-ai), [SEO routes](/docs/integrations/seo-og), and [agent routes](/docs/integrations/agent-interface) when needed; generated templates include this wiring.

## Add content

Create the content roots and a first docs page:

```sh
mkdir -p content/docs content/pages
```

```md title="content/docs/index.md"
---
title: Introduction
description: Start here to understand the product.
order: 1
---

# Introduction

Welcome to the docs.
```

## Verify the installation

Run these commands before adding hosted integrations:

```sh
pnpm check
pnpm build
```

`pnpm check` runs the application’s Svelte and TypeScript checks. Run `pnpm exec svedocs check --strict` separately for broken content links, missing descriptions, and translation gaps. Open `/docs` with `pnpm dev`, then run `pnpm build` to verify the integration with the existing adapter.

## Upgrade svedocs

Generated projects include both `svedocs` and `svedocs-cli`. Upgrade them together:

```sh
svedocs upgrade
svedocs upgrade 0.2.0
svedocs upgrade 0.2.0 --no-install
svedocs upgrade --check-only
```

Before changing dependencies, the upgrade command checks whether the requested version crosses a known breaking release. There are no special migration rules yet; future releases can add them when needed.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| The docs page renders without styles. | Confirm `svedocs/theme/styles.css` is imported from the root layout. |
| Routes do not update while editing content. | Confirm `svedocs({ config })` is registered in `vite.config.ts`. |
| Search route works locally but not in production. | Confirm provider credentials or Cloudflare bindings exist in the runtime environment. |
| Build fails in `spa` mode. | Prefer `edge` or `static`; use `spa` only for constrained hosts that need a fallback. |
