import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs'
  },
  theme: {
    palette: {
      // Try "sky", "indigo", "rose", "amber", or any CSS color.
      accent: 'emerald'
    }
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
  }
});
