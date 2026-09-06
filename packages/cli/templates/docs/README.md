# svedocs docs

Documentation starter powered by svedocs.

```sh
pnpm install
pnpm dev
pnpm build
pnpm build:ssg
```

`pnpm build` targets Cloudflare edge SSR by default with local remote bindings disabled, so builds do not require a Cloudflare account. Use `pnpm build:ssg` for static output or `pnpm build:spa` for prerendered pages plus a static fallback.

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


## Custom pages and layouts

Keep page metadata and searchable text in `content/pages/playground.md`, then replace its body with a Svelte component:

```ts
svedocs({
  config: svedocsConfig,
  pageComponents: { '/playground': '$lib/Playground.svelte' },
  layouts: { feature: '$lib/FeatureLayout.svelte' }
});
```

Set `layout: feature` in frontmatter to use a named layout. Layouts receive `SvedocsCustomLayoutProps` from `svedocs/theme/types`. Forward `page`, `pages`, `tree`, `search`, `config`, `loadSearch`, and `themeComponents` when composing `RootLayout`.

Inside `DocsApp` or `RootLayout`, `useSvedocsTheme()` from `svedocs/theme/headless` returns a reactive store with page, locale, configuration, and localized links. Read it as `$theme` in a component.

The generated universal `+page.ts` routes use `loadSvedocsPage` with lazy page, component, and layout loaders. Keep component loading there; server-only load functions cannot serialize Svelte components. `pnpm check` checks Svelte components as well as TypeScript.
