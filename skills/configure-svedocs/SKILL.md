---
name: configure-svedocs
description: Configure and validate svedocs through its typed project configuration. Use when changing svedocs.config.ts, site metadata, content roots, build mode, theme settings, Markdown hooks, search, Ask AI, SEO, OG, RSS, source links, checks, Cloudflare bindings, or i18n settings.
---

# Configure svedocs

Keep `svedocs.config.ts` as the single configuration surface shared by the Vite plugin, CLI, runtime helpers, checks, and OG generation.

## Inspect the effective setup

1. Read `svedocs.config.*` and `vite.config.*`.
2. Confirm the installed svedocs version before using a field.
3. Inspect runtime routes before changing search or Ask AI providers.
4. Inspect `svelte.config.*`, Wrangler files, and environment examples before changing build or Cloudflare settings.
5. Preserve existing values and edit only the requested sections.

Read [config-reference.md](references/config-reference.md) for the current public fields, defaults, provider choices, and cross-field constraints.

## Edit safely

- Import `defineConfig` from `svedocs/config` and export one default config object.
- Put serializable values in config. Put Svelte component paths in `svedocs({ theme: { components } })` inside `vite.config.*`.
- Set `site.url` for public sites that need absolute canonicals, sitemap URLs, hreflang, feeds, and Open Graph URLs.
- Keep `content.root`, `content.docs`, `content.pages`, and include/exclude patterns consistent.
- Choose `edge` for runtime endpoints, `static` for fully prerendered output, and `spa` only for constrained hosts.
- Enable hosted search or AI only when the matching runtime route and credentials or bindings exist.
- Store credentials in environment variables or platform bindings. Commit only examples without secrets.
- Use `false` to disable `search`, `ai`, `seo.ogImage`, `theme.footer`, or `i18n` where supported.
- Configure locales and message catalogs together; do not add messages for an unknown locale.

## Validate

Run:

```sh
svedocs check --strict
pnpm check
pnpm build
```

Use the project's package manager. Build every supported mode affected by the change. For Cloudflare configuration, run setup or deploy in dry-run mode unless the user explicitly requests a real deployment. For configuration changes in the svedocs monorepo, also test config schema rejection and resolved defaults.

