# svedocs-cli

CLI package for `svedocs` and `create-svedocs`.

`pnpm create svedocs` and `npm create svedocs@latest` are provided by the thin `create-svedocs` compatibility package, which delegates to this package.

## Commands

- `create-svedocs [dir] --template minimal|docs|cloudflare`
- `create-svedocs [dir] --package-manager auto|pnpm|npm|yarn|bun --install`
- `create-svedocs [dir] --channel auto|latest|beta`
- `svedocs create [dir] --template minimal|docs|cloudflare`
- `svedocs upgrade [latest|version|tag]`
- `svedocs upgrade 0.2.0 --no-install`
- `svedocs upgrade --check-only`
- `svedocs dev`
- `svedocs build --mode edge|static|spa`
- `svedocs ssg`
- `svedocs preview`
- `svedocs check`
- `svedocs check --strict --external-links --no-assets --translations --package`
- `svedocs check --config ./svedocs.config.ts`
- `svedocs index --format json|jsonl --out search.json`
- `svedocs index --provider cloudflare-ai-search --dry-run`
- `svedocs index --provider cloudflare-ai-search --strategy replace --existing stale-id --delete manual-id`
- `svedocs og --format svg|png --out static/og`
- `svedocs og --renderer satori --font ./Inter-Regular.ttf --format png`
- `svedocs deploy cloudflare`
- `svedocs deploy cloudflare setup --write`

The CLI loads `svedocs.config.ts`, `svedocs.config.mts`, `svedocs.config.js`, or `svedocs.config.mjs` before running content-aware commands.

Create uses the template bundled with the running CLI, so its APIs match the selected package version. Set `SVEDOCS_TEMPLATE_SOURCE=github` to opt into a remote template and use `SVEDOCS_TEMPLATE_REF=<tag|sha>` to pin it. `--channel beta` builds against the current beta packages; `--channel latest` automatically falls back to a mutually compatible beta release when latest is unavailable.

Generated projects get `svedocs` and `svedocs-cli` from the template `package.json` dependency entries. They are installed from the package registry by the selected package manager only when create is run with `--install`.

Every generated project also receives the current svedocs Agent Skills under `.agents/skills`. Codex discovers these repository-scoped skills automatically and can use them for framework setup, configuration, theme and landing customization, and localization.

`svedocs upgrade` checks the project dependency span, upgrades both `svedocs` and `svedocs-cli`, and runs the detected package manager by default. Use `--no-install` to only rewrite `package.json`, `--dry-run` to preview the plan, or `--check-only` to run compatibility checks without changing dependencies.
