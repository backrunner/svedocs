# svedocs-cli

CLI package for `svedocs` and `create-svedocs`.

`pnpm create svedocs` and `npm create svedocs@latest` are provided by the thin `create-svedocs` compatibility package, which delegates to this package.

## Commands

- `create-svedocs [dir] --template minimal|docs|cloudflare`
- `create-svedocs [dir] --package-manager auto|pnpm|npm|yarn|bun --install`
- `svedocs create [dir] --template minimal|docs|cloudflare`
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
- `svedocs deploy cloudflare --write`

The CLI loads `svedocs.config.ts`, `svedocs.config.mts`, `svedocs.config.js`, or `svedocs.config.mjs` before running content-aware commands.
