# svedocs

svedocs is a SvelteKit-native documentation framework. It ships one integrated framework package, one CLI package, a tiny `create-svedocs` compatibility package for package-manager create commands, and an official site/live demo that always consumes the workspace build.

## Workspace

- `packages/svedocs`: the complete framework package.
- `packages/cli`: the `svedocs` and `create-svedocs` binaries.
- `packages/create-svedocs`: a thin compatibility entry for `npm create svedocs` and `pnpm create svedocs`; CLI implementation still lives in `packages/cli`.
- `apps/site`: the official site and live demo, kept private.

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm check
pnpm lint
pnpm pack:dry-run
```

Before publishing packages, run:

```sh
pnpm release:check
```

Generated templates have a heavier install/build smoke test that is kept separate from the default test command:

```sh
pnpm test:templates
```

## Current Capabilities

- Content manifest, nested navigation, prev/next, search records, SEO metadata, sitemap, and robots.
- Markdown plus Svelte-compatible `.svx/.mdx` authoring through Svelte virtual components and plugin-level component injection.
- Tailwind CSS v4 default theme with scoped search, Ask AI, command palette, exact scope switcher, version lifecycle banners, sidebar, ToC, code copy, line numbers, diff row metadata, KaTeX styles, light/dark theme.
- Edge/static/SPA build modes, with Cloudflare edge SSR as the default path.
- CLI commands for `create`, `dev`, `build --mode edge|static|spa`, `ssg`, `preview`, `check`, `index`, `og`, and `deploy cloudflare`.
- `pnpm create svedocs`, `npm create svedocs@latest`, `create-svedocs`, and `svedocs create` project creation flows with package-manager detection.
- Configured search and Ask AI runtime routes with local fallback, MiniSearch-backed local search, optional Algolia and Typesense providers, current Cloudflare AI Search bindings, append/replace indexing sync, mock/Workers AI/AI Search/OpenAI-compatible Ask AI providers, SSE Ask AI responses, provider streaming passthrough, and rate limiting.
- Project config loading in both the Vite plugin and CLI, including `svedocs.config.ts`.

The product and technical plans live in `.agents/`.
