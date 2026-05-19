# svedocs minimal

Small SvelteKit docs app powered by svedocs.

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:ssg
```

`pnpm build` uses Cloudflare edge SSR by default. Use `pnpm build:ssg` for static output or `pnpm build:spa` for the discouraged SPA fallback.
