---
name: use-svedocs
description: Build, extend, and maintain svedocs documentation sites. Use when creating a svedocs project, adding Markdown/MDX/SVX content, wiring svedocs into SvelteKit, changing docs routes, using the svedocs CLI, enabling search or Ask AI, exposing the agent interface (markdown twins, llms.txt), upgrading svedocs, or diagnosing a svedocs site.
---

# Use svedocs

Treat svedocs as an integrated SvelteKit framework. Preserve its generated content model, virtual modules, route resolution, theme context, and build-mode behavior instead of recreating them in application code.

## Inspect before editing

1. Read `package.json` and detect the installed `svedocs` and `svedocs-cli` versions.
2. Read `svedocs.config.*`, `vite.config.*`, `svelte.config.*`, `src/app.d.ts`, the root layout, root page route, catch-all page route, and relevant content files.
3. Detect whether the target is a generated consumer project or the svedocs monorepo. In the monorepo, follow its `AGENTS.md` and keep framework behavior inside `packages/svedocs`.
4. Preserve existing user customizations and the selected package manager.

Read [project-workflow.md](references/project-workflow.md) for the current project shape, content conventions, CLI operations, and route wiring.

## Choose the workflow

- Create a site: use `create-svedocs` with `minimal`, `docs`, or `cloudflare`. Prefer `docs` unless the request clearly calls for the smallest setup or Cloudflare bindings.
- Add to SvelteKit: install both packages, create one `svedocs.config.ts`, register `svedocs({ config })` before `sveltekit()`, import theme CSS once, and copy the route pattern from the closest bundled template.
- Add content: place docs in the configured docs root and standalone pages in the pages root. Give public pages unique `title` and useful `description` frontmatter.
- Change behavior: use public imports such as `svedocs/config`, `svedocs/core`, `svedocs/routes`, `svedocs/theme`, `svedocs/search`, `svedocs/ai`, `svedocs/og`, `svedocs/cloudflare`, and `svedocs/agent`.
- Upgrade: update `svedocs` and `svedocs-cli` together with `svedocs upgrade`.

Use the focused companion skill when the request is mainly configuration, theme replacement, landing design, or localization.

## Preserve framework contracts

- Keep configuration in `svedocs.config.ts`; do not duplicate resolved settings in route code.
- Load project configuration before applying CLI overrides.
- Keep Svelte component paths in the Vite plugin because they are build-time imports.
- Merge with an existing catch-all route instead of creating a conflicting second catch-all. Preserve unrelated routes and the existing homepage unless svedocs should own them.
- Render compiled content from `virtual:svedocs/components` and pass `virtual:svedocs/theme-components` and `virtual:svedocs/search-loader` into `DocsApp`.
- Use `resolveSvedocsPageRoute` and `createSvedocsRouteEntries` in catch-all routes; preserve redirects for missing localized pages.
- Keep the agent interface (`svedocs/agent`) wired through the template routes: per-page markdown twins, `/llms.txt`, and `/llms-full.txt`. Agent negotiation via `createSvedocsAgentHandle` is edge-only; do not enable it for prerendered static output.
- Keep secrets in runtime environment variables or bindings, never in committed config.
- Prefer edge or static output. Use SPA only when the host requires a fallback.

## Verify

Run the project's normal type check and build, then run:

```sh
svedocs check --strict
```

For framework repository changes, use the repository's package filters and full release validation. For route or visible UI changes, smoke-test a docs page, a standalone page, an anchor, a missing route, and the mobile layout in a real browser. Exercise every configured build mode that the change can affect.
