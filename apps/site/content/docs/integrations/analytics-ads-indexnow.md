---
title: Analytics, ads, and IndexNow
description: Enable Umami, GA4, Google Ads, AdSense, and IndexNow through configuration.
order: 5
---

# Analytics, ads, and IndexNow

These integrations are optional and disabled by default. Sites using `DocsApp`, including all generated templates, only need settings in `svedocs.config.ts`. No script tags, page handlers, API routes, or extra packages are needed.

## Configure integrations

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: { url: 'https://docs.example.com' },
  integrations: {
    umami: {
      websiteId: 'your-website-id',
      // Omit src to use Umami Cloud. Set it for a self-hosted tracker.
      src: 'https://analytics.example.com/script.js'
    },
    googleAnalytics: { id: 'G-XXXXXXXXXX' },
    googleAds: {
      id: 'AW-123456789',
      conversions: {
        signup: { label: 'YOUR_CONVERSION_LABEL', path: '/thanks' }
      }
    },
    googleAdsense: {
      client: 'ca-pub-1234567890123456',
      slots: {
        article: { slot: '1234567890', format: 'auto', minHeight: 120 }
      },
      placements: { articleBottom: 'article' }
    },
    indexNow: { key: 'replace-with-your-indexnow-key' }
  }
});
```

Copy only the providers you need and replace the example IDs. Set any provider, or the entire `integrations` field, to `false` to disable it. These provider IDs and the IndexNow verification key are public values, not account API secrets.

| Setting | Default | Behavior |
| --- | --- | --- |
| `development` | `false` | Enable third-party scripts on the development server when set to `true`. |
| `respectDoNotTrack` | `true` | Suppress analytics, conversions, and advertising when the browser sends Do Not Track. |
| `umami.src` | Umami Cloud script | Supports an HTTP(S) self-hosted tracker URL. |
| `umami.domains` | `[]` | Optional list of hostnames to track. An empty list allows all hosts. |
| `googleAdsense.autoAds` | `false` | Load AdSense on all pages, even without a configured ad slot. Enable Auto ads in AdSense as well. |
| `googleAdsense.adsTxt` | `true` | Generate an `ads.txt` seller record. A user-owned `static/ads.txt` takes precedence. |
| `indexNow.endpoint` | `https://api.indexnow.org/indexnow` | HTTPS submission endpoint. |

Production previews behave like production. Use test provider IDs when verifying locally. Where consent is required, configure the provider's consent platform before enabling tracking or ads; Do Not Track is not a consent dialog.

## Pageviews and conversions

Umami and GA4 track the first page and SvelteKit client navigation, including back and forward navigation. Scripts load once per browser document. Hash-only navigation does not add a pageview. Query changes do. Tracking uses the current browser URL and page title.

In GA4's web data stream, turn off **Page changes based on browser history events** under Enhanced measurement → Page views → Advanced settings. svedocs sends pageviews itself with `send_page_view: false`; leaving GA4's history tracking enabled can duplicate them. GA4 and Google Ads share a single Google tag script.

Google Ads (`AW-…`) measures conversions. Each configured conversion with a `path` fires when that exact route is entered; trailing slashes are ignored. Changing only query parameters or the hash does not repeat the conversion. Leaving the route and returning, or reloading it, counts as a new visit. Paths are not globs and should include any locale prefix. An optional numeric `value` requires a three-letter `currency`, such as `USD`. Keep purchase conversions in a confirmation component with a transaction ID instead of treating every visit to a generic route as a purchase.

AdSense (`ca-pub-…`) displays advertisements. Create the ad unit and approve the site in AdSense first. `articleTop` and `articleBottom` select named slots around the built-in article content. Slots support `format`, `responsive` (default `true`), and `minHeight` (pixels). Ad delivery and fill remain controlled by Google. The Auto ads setting in the AdSense account applies whenever its script is loaded, including for manual slots.

## Theme components

Custom themes can import the same components from `svedocs/theme`:

```svelte
<script lang="ts">
  import { GoogleAd, GoogleAdsConversion, useSvedocsTheme } from 'svedocs/theme';
  const theme = useSvedocsTheme();
</script>

<GoogleAd
  config={$theme.config}
  name="article"
  routeKey={$theme.page?.routePath ?? ''}
  label="Advertisement"
/>
```

`name` selects a configured slot. `routeKey` recreates its ad element on navigation. Only add `GoogleAdsConversion` when the intended action succeeds:

```svelte
<GoogleAdsConversion
  config={$theme.config}
  name="signup"
  transactionId="unique-confirmed-transaction-id"
/>
```

This component fires once on mount. Omit the conversion's `path` when using it to avoid also firing a route conversion. For an event handler, `trackGoogleAdsConversion(config.integrations, name, development, transactionId)` is available from `svedocs/integrations`; pass SvelteKit's `dev` flag as `development`.

Themes that render without `DocsApp` can mount `<Integrations {config} />` once in their layout. Themes using `DocsApp` already have this behavior, including custom home and page layouts. None of these components performs network work during SSR.

## IndexNow after deployment

Choose a key with 8–128 letters, numbers, or hyphens. Set `site.url` to the deployed public origin. The Vite plugin serves `/<key>.txt` during development and emits it into client assets during **edge, static, and SPA builds**. It also emits `ads.txt` when configured. No manual route or file is required.

An existing verification file in `static/` must contain the configured key; a conflict fails the build. An existing `static/ads.txt` is preserved unchanged, so add your AdSense seller record there when maintaining it yourself.

After the build is deployed, run:

```sh
pnpm exec svedocs indexnow --dry-run
pnpm exec svedocs indexnow
```

The command loads your project config, verifies the deployed key file, and submits discoverable same-origin canonical URLs. Hidden pages, `noindex` pages, foreign canonical URLs, and duplicate URLs are excluded. Each request contains at most 10,000 URLs. HTTP 200 and 202 indicate acceptance, not guaranteed indexing; failed requests produce a nonzero exit status.

If deployment overrides the configured build mode, pass the same mode when submitting so URL trailing slashes match:

```sh
pnpm exec svedocs indexnow --config svedocs.config.ts --mode static
```

Add this command after your production deployment step in CI. Builds, previews, and page visits never submit URLs themselves. The basic command submits the current manifest; deletion notifications and incremental deployment history are not tracked. For custom deployment tooling, use `createIndexNowPayloads` or `submitIndexNow` from `svedocs/integrations`.
