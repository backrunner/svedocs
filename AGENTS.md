# svedocs Engineering Guide

## Project Shape

svedocs is a compact monorepo:

- `packages/svedocs`: the integrated framework package. Rendering, content, theme, Cloudflare, search, AI, SEO, and OG live here.
- `packages/cli`: the only CLI package. It ships both `svedocs` and `create-svedocs`.
- `packages/create-svedocs`: a thin npm/pnpm create compatibility shim. It must delegate to `@svedocs/cli` and must not grow independent CLI behavior.
- `apps/site`: the private official site and live demo. It must always use the workspace version of `svedocs`.

Do not split renderer capabilities into separate publishable packages unless the product direction changes. Prefer subdirectories inside `packages/svedocs/src`.

## Module Boundaries

Keep public entry files small and stable:

- `src/core.ts` is a barrel for content model APIs.
- `src/config.ts` owns user config schema and config file loading.
- `src/vite.ts` owns Vite virtual modules and content refresh.
- `src/search.ts`, `src/ai.ts`, `src/cloudflare.ts`, and `src/og.ts` own framework integrations.
- `src/theme/` owns Svelte components and Tailwind CSS v4 theme styles.

Keep `packages/svedocs/src/config.ts` as the single public configuration file. Do not split config types, defaults, or schema into separate public files unless this direction changes; small internal helper functions inside the file are fine.

The `src/core/` directory is split by capability:

- `types.ts`: shared content, manifest, page, tree, search, and issue types.
- `config.ts`: resolved config defaults and resolved-config detection.
- `content.ts`: file discovery and page manifest assembly.
- `navigation.ts`: page tree, sidebar order, and prev/next.
- `search.ts`: page and section search records.
- `links.ts`: markdown/html link extraction and internal link resolution.
- `checks.ts`: content issue generation.
- `utils.ts`: small pure helpers.

When a file approaches roughly 300 lines or mixes more than one responsibility, split it before adding more behavior. The exception is `src/config.ts`, which intentionally remains the single configuration surface.

## Project Status

Current implementation state:

- Monorepo is managed with pnpm, Turbo, Changesets, TypeScript, MIT licensing, package publication checks, and CI scaffolding.
- `packages/svedocs` contains the integrated framework package with content discovery, Markdown/SVX/MDX-style compilation, page tree, prev/next navigation, scoped search records, internal link and asset checks, SEO metadata, sitemap, robots, OG image generation, Cloudflare helpers, search providers, Ask AI providers, and default theme components.
- `packages/cli` ships `svedocs` and `create-svedocs`, including `create`, `dev`, `build`, `ssg`, `preview`, `check`, `index`, `og`, and `deploy cloudflare` flows.
- `packages/create-svedocs` is a compatibility shim for package-manager create commands and must stay thin.
- `apps/site` is the official site/live demo using the workspace `svedocs` package, with docs, examples, localized/versioned content, SEO/OG routes, search, Ask AI, and the pixel-style home page.
- Generated templates include minimal, docs, and Cloudflare variants. Docs and Cloudflare templates use configured search/Ask AI runtime routes with local fallback.
- Search currently supports local MiniSearch, Algolia, Typesense, and Cloudflare AI Search. Ask AI currently supports mock, Cloudflare AI Search, Workers AI, and OpenAI-compatible providers.
- Real Cloudflare deployment verification is intentionally not part of the default validation loop unless explicitly requested.

## Implementation Rules

- Preserve public imports: `svedocs/core`, `svedocs/config`, `svedocs/vite`, `svedocs/theme`, `svedocs/cloudflare`, `svedocs/search`, `svedocs/ai`, and `svedocs/og`.
- Keep framework behavior SvelteKit-native. Do not introduce a React MDX runtime.
- Use Tailwind CSS v4 and framework CSS variables for theme styling.
- Cloudflare edge SSR is the default path. Static builds are first-class. SPA builds are supported but should warn or be documented as discouraged.
- Prefer structured parsing and AST/manifest data over ad hoc UI-only logic.
- Keep templates real: generated `docs`, `minimal`, and `cloudflare` templates should be installable, buildable, and checkable.
- CLI commands that read project state must load the project `svedocs.config.*` first and only then apply command-line overrides.
- Cloudflare AI Search should use current `ai_search` / `ai_search_namespaces` bindings. Keep legacy runtime compatibility only as fallback.
- Do not place secrets or environment-specific values in committed files. Use `.dev.vars.example` for examples.

## Commit Rules

Use this commit message shape:

```txt
xxx(comp): desc
```

- `xxx` is a short change type such as `feat`, `fix`, `docs`, `test`, `chore`, or `refactor`.
- `comp` is the affected component such as `repo`, `core`, `mdx`, `theme`, `cli`, `cloudflare`, `search`, `ai`, `og`, `site`, or `docs`.
- `desc` is a concise imperative or past-tense description in English.
- Keep commits focused and batch related files together. Prefer several reviewable commits over one giant snapshot.
- Commit with `BackRunner <dev@backrunner.top>` for this repository unless the user asks for a different identity.

## Verification

For framework changes, run at least:

```sh
pnpm --filter svedocs check
pnpm --filter svedocs test
pnpm --filter svedocs build
```

For CLI changes, also run:

```sh
pnpm --filter @svedocs/cli check
pnpm --filter @svedocs/cli test
pnpm --filter @svedocs/cli build
```

For theme, routing, or official site changes, also run:

```sh
pnpm --filter @svedocs/site check
pnpm --filter @svedocs/site build
SVEDOCS_BUILD_MODE=static pnpm --filter @svedocs/site build
SVEDOCS_BUILD_MODE=spa pnpm --filter @svedocs/site build
```

Use Playwright or browser smoke tests for visible UI changes, especially search, Ask AI, sidebar, ToC, mobile navigation, and theme mode.

Run full validation before considering a batch done:

```sh
pnpm release:check
```

Run the heavier generated-template smoke test when template files, package exports, package metadata, or CLI project creation behavior changes:

```sh
pnpm test:templates
```

Publishable packages must keep `publishConfig.access` set to `public` and `publishConfig.provenance` set to `true`. Do not remove MIT license metadata or package `files`/`exports` entries without updating package publication checks.

Avoid running multiple `svelte-package` writers against `packages/svedocs/dist` at the same time.
