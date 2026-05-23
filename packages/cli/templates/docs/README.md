# svedocs docs

Documentation starter powered by svedocs.

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:ssg
```

`pnpm build` targets Cloudflare edge SSR by default with local remote bindings disabled, so builds do not require a Cloudflare account. Use `pnpm build:ssg` for static output or `pnpm build:spa` for prerendered pages plus a static fallback.
