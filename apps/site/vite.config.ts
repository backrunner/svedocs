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
      layouts: {
        feature: '$lib/FeatureLayout.svelte'
      }
    }),
    tailwindcss(),
    sveltekit()
  ]
});
