import adapterAuto from '@sveltejs/adapter-auto';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svedocsPreprocess, svedocsSvelteExtensions } from 'svedocs/svelte';
import { fileURLToPath } from 'node:url';
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
    : mode === 'spa'
      ? adapterStatic({ fallback: '200.html' })
    : mode === 'static'
        ? adapterStatic({ strict: false })
        : adapterAuto();

export default defineConfig({
  resolve: {
    alias: mode === 'edge' ? {} : {
      'cloudflare:workers': fileURLToPath(new URL('./src/lib/server/platform.ts', import.meta.url))
    }
  },
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
        Callout: '#lib/Callout.svelte'
      },
      pageComponents: {
        '/theme-preview': process.env.SVEDOCS_E2E_BORDERS
          ? '#lib/fixtures/BorderContent.svelte' : '#lib/ThemePreview.svelte',
        '/zh/theme-preview': '#lib/ThemePreview.svelte'
      },
      layouts: {
        feature: '#lib/FeatureLayout.svelte',
        'site-home': '#lib/SiteHome.svelte'
      }
    }),
    tailwindcss(),
    sveltekit({
      adapter,
      extensions: svedocsSvelteExtensions,
      preprocess: [vitePreprocess(), svedocsPreprocess()]
    })
  ]
});
