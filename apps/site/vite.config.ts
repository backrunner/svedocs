import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

export default defineConfig({
  plugins: [
    svedocs({
      config: svedocsConfig,
      components: {
        Callout: '$lib/Callout.svelte'
      },
      pageComponents: {
        '/theme-preview': '$lib/ThemePreview.svelte',
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
