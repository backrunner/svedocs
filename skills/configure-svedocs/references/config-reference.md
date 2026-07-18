# Configuration reference

## Source of truth

The public input type and schema live in `svedocs/config`. Use:

```ts
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'Acme Docs',
    description: 'Guides and references for Acme.',
    url: 'https://docs.acme.com'
  }
});
```

Do not write resolved defaults back into project config unless the project needs an explicit value.

## Top-level fields

| Field | Current shape and behavior |
| --- | --- |
| `site` | `name`, `title`, `description`, optional absolute `url` |
| `content` | `root`, `docs`, `pages`, `include[]`, `exclude[]` |
| `build` | `mode` selects `edge`, `static`, or `spa` |
| `theme` | Color mode, palette, fonts, radius, code, brand, navigation, footer, home |
| `markdown` | Compile-time `remarkPlugins`, `rehypePlugins`, Shiki transformers |
| `search` | `false` or enabled/provider/scope |
| `ai` | `false` or enabled/provider/scope/copy/suggestions/result limit |
| `seo` | Sitemap, RSS, robots, default author, serializable head additions, OG images |
| `source` | Edit-link base URL |
| `checks` | Asset, external-link, and translation checks |
| `cloudflare` | Compatibility date and AI Search binding shape |
| `i18n` | `false` or locales, default locale, URL prefixing, message catalogs |

## Defaults that affect decisions

- Content defaults to `content/docs` and `content/pages` and includes Markdown, MDX, and SVX.
- Build mode defaults to `edge`.
- Search defaults to enabled local search with `scope: 'current'`.
- Ask AI defaults to disabled unless a provider is configured; its default provider is `mock`.
- Sitemap and robots default to enabled. RSS defaults to disabled.
- OG images default to SVG output in `static/og`.
- Asset checks default to enabled; external-link and translation checks default to disabled.
- Theme mode defaults to `system`. The bundled home visual defaults to `pixel`.

## Theme configuration

`theme` accepts:

- `defaultMode: 'light' | 'dark' | 'system'`
- `palette.accent` and `palette.neutral` as built-in names or CSS colors
- `fonts.sans`, `fonts.mono`, `fonts.display`
- `radius`
- `codeTheme` as one theme string or `{ light, dark }`
- `code.lineNumbers`, `code.wrap`, `code.copyButton`
- `brand` with label/key, href, logo, pixel mark toggle
- `nav[]` and `social[]` with label/key, href, external
- `footer: false` or text and links
- `home` with kicker/key, primary/secondary actions, and pixel/image visual

Register Svelte component replacements in the Vite plugin, not here.

## Providers

Search providers include `local`, `algolia`, `typesense`, and `cloudflare-ai-search`. Ask AI providers include `mock`, `cloudflare-ai-search`, `cloudflare-workers-ai`, and `openai-compatible`.

Provider selection alone does not create credentials. Keep secrets in runtime environment variables or Cloudflare bindings. Keep the generated `/api/search` and `/api/ask` routes when hosted providers need server execution. Static and SPA output should retain a usable local fallback.

Use `scope: 'current'` for locale-aware results. Use `all` only for intentional cross-scope or cross-language search.

## SEO and feeds

- Set `site.url` for absolute canonical, Open Graph, sitemap, feed, and hreflang URLs.
- Set `seo.rss: true` for defaults or use `{ title, description, limit, locale }`.
- Put serializable global metadata in `seo.head.meta`, `seo.head.links`, and `seo.head.jsonLd`.
- Set `seo.ogImage: false` to disable automatic OG generation.
- Use the SVG renderer for portable edge output. Use PNG/Satori only with the required build-time renderer and fonts.

## Build and Cloudflare

Use:

- `edge` for SSR and runtime providers;
- `static` for complete prerendering;
- `spa` only when a host requires a fallback page.

`SVEDOCS_BUILD_MODE` and `svedocs build --mode` may override config. Keep `svelte.config.*` and generated Wrangler settings aligned. Current Cloudflare AI Search fields are `binding`, `instanceName`, optional `namespace`, and `remote`.

## Cross-field checks

- Ensure `defaultLocale` is present in `locales`.
- Do not duplicate locale codes, URL paths, or hreflang tags.
- Keep locale paths to one URL segment and away from reserved docs routing.
- Do not provide message catalogs for unknown locales.
- Keep `content.include` compatible with the configured roots.
- Do not enable a hosted provider without its endpoint and runtime environment.
- Do not commit environment-specific tokens.
