# svedocs Cloudflare

Cloudflare-first svedocs starter.

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:ssg
pnpm preview:cloudflare
```

The default build uses `@sveltejs/adapter-cloudflare` with local remote bindings disabled, so builds do not require a Cloudflare account. Static SSG builds are available with `pnpm build:ssg` or `svedocs build --mode static`; `pnpm build:spa` adds a static fallback for hosts that need one.
