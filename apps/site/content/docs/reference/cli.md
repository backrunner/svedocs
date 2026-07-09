---
title: CLI
description: Create, build, check, index, generate OG assets, and deploy to Cloudflare with the svedocs CLI.
order: 2
---

# CLI

`svedocs-cli` ships the two project binaries: `create-svedocs` and `svedocs`.
The unscoped `create-svedocs` package is a compatibility shim for package-manager create commands and delegates to `svedocs-cli`.

## Create

```sh
pnpm create svedocs my-docs --template docs
npm create svedocs@latest my-docs -- --template docs
pnpm dlx --package svedocs-cli create-svedocs my-docs --template docs
svedocs create my-docs --template cloudflare
```

The create command detects the invoking package manager from `npm_config_user_agent`, then the current project, then falls back to `pnpm`, `npm`, `yarn`, and `bun`. Use `--package-manager` or `--pm` to override it. By default it scaffolds without installing dependencies; add `--install` to run the selected package manager immediately.

Generated projects receive `svedocs` and `svedocs-cli` through the template `package.json`. The template dependency specs are normal npm package specs, so `--install` installs them through the selected package manager rather than copying framework code from the create package.

Templates are fetched from GitHub first (`backrunner/svedocs@main`) so template fixes can ship without republishing the CLI. If GitHub is unavailable, create falls back to the bundled templates. Set `SVEDOCS_TEMPLATE_SOURCE=bundled` to force bundled templates, `SVEDOCS_TEMPLATE_SOURCE=github` to fail instead of falling back, or `SVEDOCS_TEMPLATE_REF=<branch|tag|sha>` to pin a remote template version.

Templates:

| Template | Purpose |
| --- | --- |
| `minimal` | Small SvelteKit docs project with local rendering. |
| `docs` | Documentation site with local MiniSearch-powered search, sitemap, robots, and OG routes. |
| `cloudflare` | Edge-first project with Cloudflare Pages config and AI Search binding shape. |

## Upgrade

```sh
svedocs upgrade
svedocs upgrade 0.2.0
svedocs upgrade 0.2.0 --no-install
svedocs upgrade --check-only
```

The upgrade command updates both `svedocs` and `svedocs-cli`, checks the current-to-target version span, and runs the detected package manager by default. Use `--no-install` to only rewrite `package.json`, `--dry-run` to preview the dependency plan, or `--check-only` to run compatibility checks without changing files.

The compatibility layer has no breaking rules registered yet. Future breaking releases can add rules keyed to the version where the break is introduced, so upgrades that cross that version can warn or block unless `--force` is used.

## Build

```sh
svedocs build --mode edge
svedocs build --mode static
svedocs ssg
svedocs build --mode spa
```

`edge` is the default and targets Cloudflare Pages SSR. `static` and `svedocs ssg` prerender the docs site. `spa` prerenders known pages and writes a static fallback for constrained hosts; hosted Search, Ask AI, and other server-only features fall back to local behavior unless an edge runtime is available.

## Check

```sh
svedocs check --strict
svedocs check --translations
svedocs check --package
svedocs check --config ./svedocs.config.ts
```

Checks include duplicate routes, duplicate canonical URLs, missing descriptions, broken internal links, broken anchors, local assets, empty search output, SPA risk, optional translation gap warnings, and optional package export validation.

## Index

```sh
svedocs index --format json --out static/search.json
svedocs index --format jsonl --out static/search.jsonl
svedocs index --provider cloudflare-ai-search --dry-run
```

Cloudflare AI Search indexing supports append and replace strategies:

```sh
svedocs index \
  --provider cloudflare-ai-search \
  --strategy replace \
  --existing old-id,stale-id \
  --delete manual-delete \
  --wait
```

Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to upload records. Without credentials, the command stays in dry-run mode.

## OG

```sh
svedocs og --format svg --out static/og
svedocs og --format png --out static/og
svedocs og --renderer satori --font ./Inter-Regular.ttf --format png
```

SVG output has no native runtime dependency. PNG output uses Resvg at generation time.

## Deploy

```sh
svedocs deploy cloudflare
svedocs deploy cloudflare setup
svedocs deploy cloudflare setup --write
```

`deploy cloudflare` builds the configured Cloudflare output and runs `wrangler pages deploy`. If the project does not have `wrangler.toml` or `wrangler.jsonc` yet, the command initializes Cloudflare Pages config and `src/app.cloudflare.d.ts` first.

`deploy cloudflare setup` previews the generated `wrangler.toml` and platform type declarations. Add `--write` to create the files, or pass `--format jsonc` when you need `wrangler.jsonc`.
