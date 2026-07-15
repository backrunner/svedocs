# Contributing to svedocs

svedocs is an integrated SvelteKit documentation framework. Contributions should preserve the three-workspace shape described in [AGENTS.md](./AGENTS.md): `packages/svedocs`, `packages/cli`, `packages/create-svedocs`, and `apps/site`.

## Development Setup

```sh
pnpm install
pnpm build
pnpm check
pnpm test
pnpm lint
```

Use Node.js `>=20.19.0` and the pinned pnpm version in `package.json`.

## Code Guidelines

- Keep public entrypoints stable: `svedocs/config`, `svedocs/core`, `svedocs/vite`, `svedocs/theme`, `svedocs/cloudflare`, `svedocs/search`, `svedocs/ai`, and `svedocs/og`.
- Put new framework behavior inside `packages/svedocs/src` subdirectories instead of creating new publishable renderer packages.
- Keep core data processing independent of Svelte components and Cloudflare runtime APIs.
- Prefer fixture-driven tests for content compilation and CLI tests for project workflows.
- Do not commit secrets, account IDs, private endpoints, or generated credentials. Add examples to `.dev.vars.example` instead.

## Validation Matrix

For framework changes:

```sh
pnpm --filter svedocs check
pnpm --filter svedocs test
pnpm --filter svedocs build
```

For CLI changes:

```sh
pnpm --filter svedocs-cli check
pnpm --filter svedocs-cli test
pnpm --filter svedocs-cli build
```

For theme, routing, or official site changes:

```sh
pnpm --filter @svedocs/site check
pnpm --filter @svedocs/site build
SVEDOCS_BUILD_MODE=static pnpm --filter @svedocs/site build
SVEDOCS_BUILD_MODE=spa pnpm --filter @svedocs/site build
pnpm --filter @svedocs/site test:e2e
```

Before release preparation, run:

```sh
pnpm release:check
```

When template files, package exports, packaging metadata, or CLI project creation behavior changes, also run:

```sh
pnpm test:templates
```

`pnpm test:templates` packs the local framework and CLI, creates each template, installs it in a temporary project, then runs template `check` and `build`. It is intentionally separated from the default test script because it performs real package installs.

## Release Notes

Use Changesets for publishable package changes:

```sh
pnpm changeset
```

Keep changesets focused on user-visible behavior or public API changes. Internal-only changes can be documented in `.agents/gap-analysis.md` when they affect implementation status.

Site deployments run manually from an authenticated local Wrangler session:

```sh
pnpm deploy:site:dry-run
pnpm deploy:site
```

Publishable packages use npm provenance via `publishConfig.provenance: true`. Dispatch the `Release npm packages` workflow with the matching stable or beta channel so npm trusted publishing remains the release path.
