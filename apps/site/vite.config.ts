import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

export default defineConfig({
  plugins: [
    svedocs({
      config: svedocsConfig,
      theme: { components: {
        ...(process.env.SVEDOCS_E2E_SEO ? { Seo: fileURLToPath(new URL('./e2e/fixtures/CustomSeo.svelte', import.meta.url)) } : {}),
        ...(process.env.SVEDOCS_E2E_BORDERS ? {
          Article: fileURLToPath(new URL('./e2e/fixtures/BorderArticle.svelte', import.meta.url)),
          PageShell: fileURLToPath(new URL('./e2e/fixtures/BorderPageShell.svelte', import.meta.url))
        } : {})
      } },
      components: {
        Callout: '$lib/Callout.svelte'
      },
      pageComponents: {
        '/theme-preview': process.env.SVEDOCS_E2E_BORDERS
          ? '$lib/fixtures/BorderContent.svelte' : '$lib/ThemePreview.svelte',
        '/zh/theme-preview': '$lib/ThemePreview.svelte'
      },
      layouts: {
        feature: '$lib/FeatureLayout.svelte',
        'site-home': '$lib/SiteHome.svelte'
      }
    }),
    tailwindcss(),
    sveltekit()
  ]
});
