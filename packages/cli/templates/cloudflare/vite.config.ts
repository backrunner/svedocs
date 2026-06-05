import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

export default defineConfig({
  plugins: [
    svedocs({
      config: svedocsConfig,
      // Register custom theme components here, then remove the default
      // styles import in src/routes/+layout.svelte if you want full control.
      // theme: { components: { Navbar: '$lib/theme/Navbar.svelte' } }
    }),
    tailwindcss(),
    sveltekit()
  ]
});
