# SEO fixes and verification — 2026-09-07

The technical SEO audit findings have been addressed. This report covers local framework behavior and the official site's generated output; it does not measure production indexing or search rankings.

## Changes

| Area | Before | After |
| --- | --- | --- |
| Indexing | HTML hreflang could include noindex translations; sitemap ignored robots in custom head metadata. | One internal indexing policy combines global/page generic robots directives conservatively and filters hreflang, sitemap, RSS, and agent discovery. The public unary `isDiscoverablePage()` predicate remains compatible with `Array.filter`. |
| Sharing cache | Route-only OG URLs advertised a year of immutable caching. | Stable URLs require revalidation (`public, max-age=0, must-revalidate`). Existing public route helpers remain unchanged. Static hosts that override caching must apply equivalent rules. |
| Sharing images | All 44 official images were SVG; dimensions/type/alt tags were absent. | PNG is the configured default, generated during Node builds or prerendering. Tags include accurate dimensions/type and OG/Twitter alt text. Custom images only receive dimensions/type explicitly supplied by the author. |
| Image rendering | App prerender bundles could not resolve pnpm's framework-owned native renderer; long titles clipped. | Node renderer resolution starts from the installed framework package. Default SVG composition wraps multilingual titles before rasterization. Chinese glyphs and the new homepage image were visually checked locally. |
| Content dates | Filesystem mtime drove sitemap, structured data, RSS fallback, and the visible update label. | Explicit `updatedTime` drives modification metadata and the visible update label. RSS uses explicit updated/published dates. Missing dates are omitted; public `page.lastUpdated` remains available. |
| Titles | Chinese homepage repeated the brand; same-language component guides shared titles. | `seoTitle` supports independent search/share titles. Homepages explain the product and omit duplicate suffixes; theme component reference titles differ from writing guides. |
| Structured data | Only WebPage/TechArticle; team author typed as Person. | BreadcrumbList shares real localized ancestor relationships with the UI and respects custom breadcrumb graphs. Optional page `authorType` and `seo.defaultAuthorType` support Organization. |
| OG locale | Language-only `en` was emitted as an OG locale. | Optional i18n `ogLocale` specifies a region without changing hreflang. Regional tags normalize to language_TERRITORY; language-only tags do not guess a territory. Official English explicitly uses `en_US`. |
| Canonical duplicates | Sitemap could emit duplicate locations; content checks compared raw canonical strings. | Sitemap deduplicates resolved locations, and checks normalize relative/absolute canonical aliases before reporting duplicates. |

Implementation is concentrated in [core/seo.ts](packages/svedocs/src/core/seo.ts), [og/metadata.ts](packages/svedocs/src/og/metadata.ts), [og/structured-data.ts](packages/svedocs/src/og/structured-data.ts), [og/image.ts](packages/svedocs/src/og/image.ts), and [og/svg.ts](packages/svedocs/src/og/svg.ts).

## Compatibility and deployment

- PNG rasterization requires Node and runs before deployment. Dynamic Cloudflare OG rendering can explicitly use SVG. Standard generated routes prerender image entries, and CLI builds generate static assets before Vite copies them.
- `createPageOgImagePath(page)` retains its SVG default for existing callers. Use the configured format with this helper when consuming the default PNG configuration.
- The SVG-to-PNG renderer uses fonts installed on the build machine. For reproducible CJK assets across machines, use Satori with explicit font files containing the needed glyphs. Font files are not fetched during requests.
- Existing public page fields and imports remain available. Editorial dates and newly added metadata options are documented in the English and Chinese SEO guides.
- Existing custom robots tags targeting a particular bot retain that scope; generic robots directives control the shared discovery policy.

## Regression coverage

[seo.test.ts](packages/svedocs/test/seo.test.ts) covers noindex/none, global/page head directives, default-language exclusion and x-default, canonical deduplication, localized titles, author/locale semantics, custom image metadata, breadcrumbs and custom graphs, image freshness/dimensions, escaped multilingual titles, and unchanged SEO output after an mtime-only change. Explicit dates and independent SEO titles are checked through actual content loading.

[seo.spec.ts](apps/site/e2e/seo.spec.ts) checks the production site with JavaScript disabled and a Googlebot user-agent, localized metadata, real PNG responses, Organization/BreadcrumbList graphs, homepage titles, omitted untrusted visible dates, and missing-route 404s. Existing UI/search tests run alongside it.

The static audit checks all 44 HTML pages and PNG files: one nonempty title/description, one HTTPS canonical and H1, reciprocal hreflang targets, parseable JSON-LD, correct image dimensions/type/alt, real breadcrumb targets, and explicit-only sitemap modification dates. No same-language duplicate titles remain; product names such as CLI and Cloudflare may still match across translations.

```sh
pnpm --filter svedocs build
SVEDOCS_BUILD_MODE=static pnpm --filter @svedocs/site build
node scripts/audit-seo.mjs
node scripts/verify-rendering.mjs --static
```

Raw results are written to `artifacts/seo-audit.json` and `artifacts/static-verification.json`. Build output must correspond to the current content/configuration. Chromium must be installed for Playwright.

## Completed validation

- `pnpm release:check`: passed, including framework/CLI builds, checks, tests, lint, and package publication checks. Framework: 207 passed, 1 skipped. CLI: 33 passed, 1 template opt-in skipped in the standard run.
- `pnpm test:templates`: 34 passed, including install/check/edge build for minimal/docs/cloudflare and actual static builds, repeated SSG, title changes, and deleted-page output checks. Default PNG assets exist in each generated deployment output.
- Official edge, static, and SPA builds: passed.
- Production edge SSR and static browser suites: each 17 passed, 1 opt-in HMR test skipped.
- Final no-JavaScript static verification: 44 HTML pages, 44 Markdown twins, 280 headings, 704 asset references, and real missing-route 404 behavior.
- Final SEO audit: 44 valid PNGs, no missing image alt tags, 34 article breadcrumb graphs, no duplicate canonicals or same-language titles, and no mtime-derived SEO dates.
- SSR rendering verification: identical cached/bypassed HTML, agent negotiation isolation, HEAD, and ETag checks passed.
- `git diff --check` and audit-script syntax check: passed.
