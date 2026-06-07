# svedocs minimal

Small SvelteKit docs app powered by svedocs.

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:ssg
```

`pnpm build` uses Cloudflare edge SSR by default with local remote bindings disabled, so builds do not require a Cloudflare account. Use `pnpm build:ssg` for static output or `pnpm build:spa` for prerendered pages plus a static fallback.

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
