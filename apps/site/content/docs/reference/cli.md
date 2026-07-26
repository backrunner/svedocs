---
title: CLI
description: Create, build, check, index, generate OG assets, and deploy to Cloudflare with the svedocs CLI.
order: 2
---

# CLI

`svedocs-cli` provides two binaries: `create-svedocs` for scaffolding a project and `svedocs` for working with an existing one. The unscoped `create-svedocs` package only provides compatibility with package-manager create commands; it delegates all behavior to `svedocs-cli`.

## Create

```sh
pnpm create svedocs my-docs --template docs
npm create svedocs@latest my-docs -- --template docs
pnpm dlx --package svedocs-cli create-svedocs my-docs --template docs
svedocs create my-docs --template cloudflare
```

The create command first checks `npm_config_user_agent`, then the current project, to determine which package manager to use. If neither provides an answer, it looks for `pnpm`, `npm`, `yarn`, and `bun` in that order. Use `--package-manager` or `--pm` to choose one explicitly. Dependencies are not installed by default; add `--install` to install them immediately.

Generated projects receive `svedocs` and `svedocs-cli` through the template `package.json`. The template dependency specs are normal npm package specs, so `--install` installs them through the selected package manager rather than copying framework code from the create package.

Create also installs the current svedocs Agent Skills into `.agents/skills` for repository-level discovery. This happens for GitHub templates and the bundled fallback, independently of `--install`.

Templates default to the copy bundled with the running CLI, keeping template APIs and package versions aligned. Use `--channel beta` for beta packages, or `--channel latest` to prefer latest and fall back to a compatible beta release when latest is unavailable. Set `SVEDOCS_TEMPLATE_SOURCE=github` only when opting into a remote template, and pin it with `SVEDOCS_TEMPLATE_REF=<tag|sha>`.

Templates:

| Template | Purpose |
| --- | --- |
| `minimal` | Small SvelteKit docs project with local rendering. |
| `docs` | Documentation site with local MiniSearch-powered search, sitemap, robots, optional RSS, and OG routes. |
| `cloudflare` | Edge-first project with Cloudflare Pages config and AI Search binding shape. |

## Upgrade

```sh
svedocs upgrade
svedocs upgrade 0.2.0
svedocs upgrade 0.2.0 --no-install
svedocs upgrade --check-only
```

The upgrade command updates both `svedocs` and `svedocs-cli`, checks the current-to-target version span, and runs the detected package manager by default. Use `--no-install` to only rewrite `package.json`, `--dry-run` to preview the dependency plan, or `--check-only` to run compatibility checks without changing files.

No breaking-change rules are registered yet. A future release can attach a rule to the version that introduces a breaking change. Upgrades that cross that version can then warn or stop, with `--force` available as an explicit override.

## Build

```sh
svedocs build --mode edge
svedocs build --mode static
svedocs ssg
svedocs build --mode spa
```

`edge` is the default and targets Cloudflare Pages SSR. `static` and `svedocs ssg` prerender the whole docs site. `spa` prerenders known pages and writes a fallback page for constrained hosts. Without an edge runtime, hosted search, Ask AI, and other server-only features use their local alternatives.

## Check

```sh
svedocs check --strict
svedocs check --translations
svedocs check --package
svedocs check --config ./svedocs.config.ts
```

Checks include duplicate routes, duplicate canonical URLs, missing descriptions, broken internal links, broken anchors, local assets, empty search output, SPA risk, optional translation gaps across public docs and standalone pages, and optional package export validation.

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
