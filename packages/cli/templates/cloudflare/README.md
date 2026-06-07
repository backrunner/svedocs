# svedocs Cloudflare

Cloudflare-first svedocs starter.

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:ssg
pnpm preview:cloudflare
```

The default build uses `@sveltejs/adapter-cloudflare` with local remote bindings disabled and local binding persistence off, so builds do not require a Cloudflare account or shared local emulator state. Static SSG builds are available with `pnpm build:ssg` or `svedocs build --mode static`; `pnpm build:spa` adds a static fallback for hosts that need one.

## Custom themes

This template imports the bundled theme from `src/routes/+layout.svelte`:

```svelte
import 'svedocs/theme/styles.css';
```

Keep that import for the default look, switch to `svedocs/theme/base.css` for only reset/accessibility/prose/code structure, or remove it when your app owns all styles.

Register replacement theme components in `vite.config.ts`:

```ts
svedocs({
  config: svedocsConfig,
  theme: {
    components: {
      Navbar: '$lib/theme/Navbar.svelte',
      Article: '$lib/theme/Article.svelte',
      Search: '$lib/theme/Search.svelte',
      AskAi: '$lib/theme/AskAi.svelte',
      Error: '$lib/theme/Error.svelte'
    }
  }
});
```

Generated routes pass `virtual:svedocs/theme-components` into `DocsApp`, and `src/routes/+error.svelte` uses the same map for custom error pages with a safe fallback to the default `ErrorPage`.
