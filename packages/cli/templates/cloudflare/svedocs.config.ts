import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'svedocs cloudflare',
    title: 'svedocs cloudflare',
    description: 'Edge-first documentation powered by svedocs and Cloudflare Pages.'
  },
  theme: {
    palette: {
      // Try "sky", "indigo", "rose", "amber", or any CSS color.
      accent: 'emerald'
    }
  },
  search: {
    enabled: true,
    provider: 'cloudflare-ai-search'
  },
  ai: {
    enabled: true,
    provider: 'cloudflare-ai-search'
  },
  source: {
    editBaseUrl: 'https://github.com/acme/my-docs/edit/main'
  },
  cloudflare: {
    aiSearch: {
      binding: 'SVEDOCS_AI_SEARCH',
      instanceName: 'svedocs'
    }
  }
});
