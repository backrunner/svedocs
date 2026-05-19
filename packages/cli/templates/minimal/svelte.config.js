import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svedocsPreprocess, svedocsSvelteExtensions } from 'svedocs/svelte';

const mode = process.env.SVEDOCS_BUILD_MODE ?? 'edge';
const adapter =
  mode === 'edge'
    ? adapterCloudflare()
    : adapterStatic(mode === 'spa' ? { fallback: 'index.html' } : { strict: false });

export default {
  extensions: svedocsSvelteExtensions,
  preprocess: [vitePreprocess(), svedocsPreprocess()],
  kit: {
    adapter
  }
};
