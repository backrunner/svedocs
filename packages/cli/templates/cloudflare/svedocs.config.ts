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
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', label: 'English', hreflang: 'en' },
      { code: 'zh', label: '中文', hreflang: 'zh-CN' }
    ],
    // Add translated content under content/docs/zh when you are ready.
    // These messages localize the site shell, landing slots, search, and Ask AI.
    messages: {
      zh: {
        'search.placeholder': '搜索文档',
        'ask.label': '问 AI',
        'home.primaryAction': '阅读文档'
      }
    }
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
