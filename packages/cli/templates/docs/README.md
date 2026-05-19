# svedocs docs

Documentation starter powered by svedocs.

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:ssg
```

`pnpm build` targets Cloudflare edge SSR by default. Use `pnpm build:ssg` for static output or `pnpm build:spa` only when an SPA fallback is required.
