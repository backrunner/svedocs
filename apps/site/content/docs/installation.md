---
title: Installation
description: Install svedocs in a new project, wire it into an existing SvelteKit app, and keep the framework dependencies current.
order: 2
---

# Installation

You can start with a generated project or add svedocs to an existing SvelteKit application. New projects are the easiest path because the template includes the route structure, config file, content folders, and runtime endpoints.

## Requirements

- Node.js 22 or newer.
- A SvelteKit project using ESM.
- pnpm, npm, yarn, or bun. The templates default to pnpm because the repository itself uses pnpm.

## Create a new project

```sh
pnpm create svedocs my-docs --template docs
cd my-docs
pnpm install
pnpm dev
```

The create package is a compatibility shim for package-manager create commands. It delegates to `svedocs-cli`, fetches the selected template from GitHub first, falls back to the bundled template when needed, rewrites the project name and package manager field, and then stops unless you pass `--install`.

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

When you run create with `--install`, the selected package manager installs those packages from your configured registry. The create package does not copy framework code into your project.

## Choose a template

```sh
pnpm create svedocs my-docs --template minimal
pnpm create svedocs my-docs --template docs
pnpm create svedocs my-docs --template cloudflare
```

| Template | Included routes | Best for |
| --- | --- | --- |
| `minimal` | Docs shell and content routes. | Learning the basics or embedding docs into an existing app. |
| `docs` | Search, Ask AI fallback, sitemap, robots, and OG routes. | Most product documentation sites. |
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
pnpm add -D svedocs-cli
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
  }
});
```

Register the Vite plugin:

```ts title="vite.config.ts"
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

export default {
  plugins: [
    svedocs({ config: svedocsConfig })
  ]
};
```

Import the default theme CSS once in the root layout:

```svelte title="src/routes/+layout.svelte"
<script>
  import 'svedocs/theme/styles.css';
</script>

<slot />
```

Then add the generated route shape you need. The simplest route can load `DocsApp` from `svedocs/theme`; the fuller templates show search, Ask AI, sitemap, robots, and OG routes.

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

`pnpm check` validates the content manifest. `pnpm build` verifies that SvelteKit, the svedocs Vite plugin, route files, theme imports, and configured build mode all work together.

## Upgrade svedocs

Generated projects include both `svedocs` and `svedocs-cli`. Upgrade them together:

```sh
svedocs upgrade
svedocs upgrade 0.2.0
svedocs upgrade 0.2.0 --no-install
svedocs upgrade --check-only
```

The upgrade command checks the current-to-target version span before changing dependencies. There are no breaking-version rules registered yet, but the compatibility layer is in place so future breaking releases can warn or block when an upgrade crosses a registered boundary.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| The docs page renders without styles. | Confirm `svedocs/theme/styles.css` is imported from the root layout. |
| Routes do not update while editing content. | Confirm `svedocs({ config })` is registered in `vite.config.ts`. |
| Search route works locally but not in production. | Confirm provider credentials or Cloudflare bindings exist in the runtime environment. |
| Build fails in `spa` mode. | Prefer `edge` or `static`; use `spa` only for constrained hosts that need a fallback. |
