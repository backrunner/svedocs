import adapterAuto from '@sveltejs/adapter-auto';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svedocsPreprocess, svedocsSvelteExtensions } from 'svedocs/svelte';

const mode = process.env.SVEDOCS_BUILD_MODE ?? 'edge';
const remoteBindings = process.env.SVEDOCS_REMOTE_BINDINGS === 'true';
const adapter =
  mode === 'edge'
    ? adapterCloudflare({ platformProxy: { remoteBindings, persist: false } })
    : mode === 'spa'
      ? adapterStatic({ fallback: '200.html' })
    : mode === 'static'
        ? adapterStatic({ strict: false })
        : adapterAuto();

export default {
  extensions: svedocsSvelteExtensions,
  preprocess: [vitePreprocess(), svedocsPreprocess()],
  kit: {
    adapter
  }
};
