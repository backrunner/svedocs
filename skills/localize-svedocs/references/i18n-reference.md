# Internationalization reference

- [Locale fields](#locale-fields)
- [Content layout and routes](#content-layout-and-routes)
- [Message catalogs](#message-catalogs)
- [Links and fallback](#links-and-fallback)
- [Search and Ask AI](#search-and-ask-ai)
- [SEO](#seo)
- [Validation](#validation)

## Locale fields

| Field | Purpose |
| --- | --- |
| `code` | Stable internal identifier on pages, records, filters |
| `label` | Native human-readable language name |
| `path` | Single content directory and URL segment; defaults to code |
| `hreflang` | BCP 47 HTML/SEO language tag; defaults to code |
| `dir` | `ltr` or `rtl`; defaults to `ltr` |
| `defaultLocale` | Locale used for unprefixed and fallback routes |
| `prefixDefaultLocale` | Whether default-locale URLs include their locale path |

svedocs rejects duplicate codes, paths, or language tags, unknown defaults, invalid/multi-segment paths, reserved route conflicts, and message catalogs for unknown locales.

## Content layout and routes

```txt
content/
├── docs/
│   ├── en/index.md
│   ├── en/guides/deploy.md
│   ├── zh/index.md
│   └── zh/guides/deploy.md
└── pages/
    ├── en/index.md
    └── zh/index.md
```

With default `en` and `prefixDefaultLocale: false`:

| Source | Route |
| --- | --- |
| `content/docs/en/index.md` | `/docs` |
| `content/docs/zh/index.md` | `/docs/zh` |
| `content/docs/zh/guides/deploy.md` | `/docs/zh/guides/deploy` |
| `content/pages/en/index.md` | `/` |
| `content/pages/zh/index.md` | `/zh` |

With prefixing enabled, default routes become `/docs/en` and `/en`.

Default-locale content may instead live directly below each content root. Do not keep both root files and matching default-locale-directory files because they create duplicate routes. Mirror relative paths across locales so translation groups remain stable.

## Message catalogs

`i18n.messages` overrides the English base catalog. Missing keys fall back to English.

Theme nav/social/footer/action items accept `labelKey`. Brand accepts `labelKey`. Home accepts `kickerKey` and image `altKey`. Custom keys are allowed.

Built-in key groups cover navigation, scope selection, search, Ask AI, ToC, headings, article actions, code tools, page tools, theme mode, home actions/cards, errors, render boundaries, and footer text. Inspect the installed base catalog before attempting a complete shell translation.

In custom Svelte components:

- use `context.t(key, values)` for UI copy;
- use `context.localeCode` for filters and stored state;
- use `context.languageTag` for `lang` and locale formatting;
- use `context.locale?.dir` for direction.

Translate page frontmatter as well as bodies: title, description, nav title, keywords, and meaningful image alt text all feed visible UI or metadata.

## Links and fallback

svedocs localizes configured navigation and Markdown links when a translation exists. Locale-neutral `/docs/guides` can become `/docs/zh/guides`. Explicit locale URLs stay explicit. Query strings and fragments are preserved.

Use `LocalizedLink` or `resolveLocalizedHref` in custom components.

The locale switcher disables a locale when the current translation does not exist. Other internal links may fall back to the default-locale page. Missing localized edge routes redirect with HTTP 307; static and SPA output generate equivalent finite redirect documents.

Keep the generated catch-all contract:

```ts
export function entries() {
  return createSvedocsRouteEntries(pages, config)
    .map((path) => ({ path: path.replace(/^\//, '') }));
}

const resolution = resolveSvedocsPageRoute(routePath, pages, config);
if (resolution.status === 'redirect') {
  redirect(307, resolution.location);
}
```

`createSvedocsRouteEntries` includes finite missing-translation paths so static and SPA adapters can write redirect documents.

## Search and Ask AI

Page and section records carry `metadata.locale = code`. Keep `scope: 'current'` to prevent mixed-language results and citations. Hosted indexes must keep locale filterable. Use `all` only when cross-language results are intentional.

Hosted search and Ask AI providers require their generated edge endpoints and runtime credentials or bindings. Static and SPA builds use local records and fallback behavior; verify both paths when the project supports both output modes.

## SEO

Set `site.url`. For translations that exist, svedocs emits canonical URLs, reciprocal hreflang, `x-default`, sitemap alternates, Open Graph locales, JSON-LD `inLanguage`, and document `lang`/`dir`.

Do not advertise missing translations. A custom root metadata implementation must use the complete page list so alternates can be derived.

## Validation

Enable:

```ts
checks: {
  translations: true
}
```

Then run:

```sh
svedocs check --translations --strict
```

This strict check requires complete public-page coverage. For a deliberate partial rollout, run translation checks without `--strict` while testing runtime fallback, then enable strict coverage before declaring the locale complete.

After file moves or locale changes, verify duplicate routes, one route per locale, a missing translation, internal links with fragments, localized home routing, RTL layout, scoped search/AI, 404 fallback, canonical, and hreflang.
