import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { svedocs } from 'svedocs/vite';
import config from '../../svedocs.config';
import siteVite from '../../vite.config';

// Fake provider IDs are used only by the isolated integration smoke tests.
export default defineConfig({
  ...siteVite,
  server: { fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  plugins: [
    svedocs({
      config: {
        ...config,
        integrations: {
          development: true,
          umami: { websiteId: 'svedocs-test', src: 'https://analytics.example.com/script.js' },
          googleAnalytics: { id: 'G-SVEDOCSTEST' },
          googleAds: { id: 'AW-123456789', conversions: {
            install: { label: 'installed', path: '/docs/installation' },
            custom: { label: 'custom', value: 5, currency: 'USD' }
          } },
          googleAdsense: {
            client: 'ca-pub-1234567890123456',
            slots: { article: { slot: '1234567890' } },
            placements: { articleBottom: 'article' }
          },
          indexNow: { key: 'svedocs-indexnow-test' }
        }
      },
      components: { Callout: '$lib/Callout.svelte' },
      layouts: { feature: '$lib/FeatureLayout.svelte', 'site-home': '$lib/SiteHome.svelte' },
      pageComponents: { '/theme-preview': fileURLToPath(new URL('./IntegrationTheme.svelte', import.meta.url)) }
    }),
    ...(siteVite.plugins ?? []).slice(1)
  ]
});
