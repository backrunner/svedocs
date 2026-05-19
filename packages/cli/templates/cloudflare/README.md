# svedocs Cloudflare

Cloudflare-first svedocs starter.

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:ssg
pnpm preview:cloudflare
```

The default build uses `@sveltejs/adapter-cloudflare`. Static SSG builds are available with `pnpm build:ssg` or `svedocs build --mode static`.
