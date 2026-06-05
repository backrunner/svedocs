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
- `svedocs/og`: SEO metadata, sitemap/robots, SVG/PNG/Satori OG generation.
- `svedocs/cloudflare`: build presets, wrangler config, and binding type helpers.

All rendering, theme, search, AI, SEO, OG, and Cloudflare capabilities are intentionally kept inside this package.

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
