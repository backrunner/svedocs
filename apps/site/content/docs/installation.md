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

The `create-svedocs` package forwards the command to `svedocs-cli`. The CLI downloads the selected template from GitHub, uses its bundled copy if GitHub is unavailable, and updates the project name and package manager. Pass `--install` when you also want it to install dependencies.

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

Then add the routes your site needs. A minimal setup can render `DocsApp` from `svedocs/theme`; generated templates include sitemap, robots, and optional RSS routes, while `docs` and `cloudflare` also show the complete search, Ask AI, and OG setup.

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

Before changing dependencies, the upgrade command checks whether the requested version crosses a known breaking release. There are no special migration rules yet; future releases can add them when needed.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| The docs page renders without styles. | Confirm `svedocs/theme/styles.css` is imported from the root layout. |
| Routes do not update while editing content. | Confirm `svedocs({ config })` is registered in `vite.config.ts`. |
| Search route works locally but not in production. | Confirm provider credentials or Cloudflare bindings exist in the runtime environment. |
| Build fails in `spa` mode. | Prefer `edge` or `static`; use `spa` only for constrained hosts that need a fallback. |
