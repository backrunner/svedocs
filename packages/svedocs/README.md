# svedocs

Integrated SvelteKit documentation framework package.

## Exports

- `svedocs/config`: config schema and `defineConfig`.
- `svedocs/core`: content manifest, scoped navigation, checks, search records, and shared types.
- `svedocs/vite`: virtual modules and content refresh Vite plugin.
- `svedocs/theme`: default Svelte theme components, replaceable theme component map, and Tailwind CSS v4 styles.
- `svedocs/theme/headless`: unstyled theme behavior controllers for custom themes.
- `svedocs/theme/types`: public theme component prop and component-map types.
- `svedocs/svelte`: `mdsvex`-based Svelte-compatible authoring helpers.
- `svedocs/search`: weighted local search, scope filters, Cloudflare AI Search provider, and indexing sync.
- `svedocs/ai`: Ask AI providers, SSE responses, and rate limiting helpers.
- `svedocs/og`: SEO metadata, sitemap/robots, opt-in RSS, SVG/PNG/Satori OG generation.
- `svedocs/cloudflare`: build presets, wrangler config, and binding type helpers.

All rendering, theme, search, AI, SEO, OG, and Cloudflare capabilities are intentionally kept inside this package.

## Theme Development

The default theme is optional and replaceable. Import the full bundled CSS when you want the standard look:

```svelte
<script lang="ts">
  import 'svedocs/theme/styles.css';
</script>
```

Custom themes can import only `svedocs/theme/base.css` for reset, accessibility, prose, and code structure, or skip theme CSS entirely and own every style.

Register replacement components in the Vite plugin, not `svedocs.config.ts`, because Svelte component paths are build-time imports:

```ts
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

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

Generated routes import `virtual:svedocs/theme-components` and pass the map to `DocsApp`. You can replace broad page layouts such as `Root`, `Layout`, `Docs`, `Page`, `Home`, and `Error`, or smaller pieces such as `Navbar`, `Sidebar`, `Article`, `Toc`, `Search`, `AskAi`, `Footer`, `ThemeToggle`, `PageTools`, and `RenderError`.

Use `svedocs/theme/types` for stable props and `svedocs/theme/headless` for unstyled behavior controllers such as search, Ask AI, ToC tracking, theme mode, mobile nav, page tools, and code-copy behavior. Replacement page layouts should keep passing `pages`, `tree`, `search`, `config`, `loadSearch`, and `themeComponents` into nested default components so navigation highlighting, mobile menus, and runtime panels stay connected.

Generated templates include `src/routes/+error.svelte`. Register `theme.components.Error` to customize full-route error pages and `theme.components.RenderError` to customize local render-boundary failures inside layouts, articles, and tools.

## MDX/SVX Components

The Vite plugin loads `svedocs.config.ts` by default. You can also pass a config object explicitly and register shared authoring components or layouts:

```ts
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

svedocs({
  config: svedocsConfig,
  components: {
    Callout: '$lib/Callout.svelte'
  },
  layouts: {
    feature: '$lib/FeatureLayout.svelte'
  },
  theme: {
    components: {
      Navbar: '$lib/theme/Navbar.svelte',
      Article: '$lib/theme/Article.svelte'
    }
  }
})
```

`.svx` and `.mdx` files can then use `<Callout />` without local imports.
Registered theme components are exposed through `virtual:svedocs/theme-components` and can replace default navigation, article, search, Ask AI, ToC, and footer rendering.
