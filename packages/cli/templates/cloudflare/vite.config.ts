import { fileURLToPath } from 'node:url';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svedocsPreprocess, svedocsSvelteExtensions } from 'svedocs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config.ts';

const mode = process.env.SVEDOCS_BUILD_MODE ?? 'edge';
const remoteBindings = process.env.SVEDOCS_REMOTE_BINDINGS === 'true';
const adapter =
  mode === 'edge'
    ? adapterCloudflare({ platformProxy: { remoteBindings, persist: false } })
    : adapterStatic(mode === 'spa' ? { fallback: '200.html' } : { strict: false });

export default defineConfig({
  resolve: {
    alias: mode === 'edge' ? {} : {
      'cloudflare:workers': fileURLToPath(new URL('./src/lib/server/platform.ts', import.meta.url))
    }
  },
  plugins: [
    svedocs({
      config: svedocsConfig,
      // Register custom theme components here, then remove the default
      // styles import in src/routes/+layout.svelte if you want full control.
      // theme: { components: { Navbar: '#lib/theme/Navbar.svelte' } }
    }),
    tailwindcss(),
    sveltekit({
      adapter,
      extensions: svedocsSvelteExtensions,
      preprocess: [vitePreprocess(), svedocsPreprocess()]
    })
  ]
});
