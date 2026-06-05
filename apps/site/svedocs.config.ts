import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'svedocs',
    title: 'svedocs',
    description: 'A SvelteKit-native documentation framework for edge-first docs.',
    url: 'https://svedocs.dev'
  },
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages'
  },
  theme: {
    defaultMode: 'system',
    palette: {
      accent: 'emerald',
      neutral: 'zinc'
    },
    fonts: {
      sans: '"IBM Plex Sans", "Avenir Next", sans-serif',
      mono: '"JetBrains Mono", "SFMono-Regular", monospace',
      display: '"IBM Plex Sans", "Avenir Next", sans-serif'
    },
    radius: '2px',
    codeTheme: {
      light: 'light-plus',
      dark: 'dark-plus'
    },
    nav: [
      { label: 'Docs', href: '/docs' },
      { label: 'Configuration', href: '/docs/configuration' },
      { label: 'API', href: '/docs/reference/api' }
    ],
    brand: {
      label: 'svedocs',
      href: '/',
      logo: '/favicon-256x256.png'
    },
    social: [],
    footer: {
      text: 'Made by Alkinum with ♥',
      links: [
        { label: 'MIT Open Source', href: 'https://github.com/svedocs/svedocs/blob/main/LICENSE', external: true },
        { label: 'GitHub', href: 'https://github.com/svedocs/svedocs', external: true }
      ]
    },
    home: {
      kicker: '',
      primaryAction: { label: 'Read docs', href: '/docs' },
      secondaryAction: { label: 'Configure', href: '/docs/configuration' },
      visual: { type: 'pixel', alt: '' }
    }
  },
  markdown: {
    remarkPlugins: [],
    rehypePlugins: []
  },
  search: {
    enabled: true,
    provider: 'local',
    scope: 'current'
  },
  ai: {
    enabled: true,
    provider: 'cloudflare-ai-search',
    scope: 'current',
    label: 'Ask AI',
    placeholder: 'Ask anything about svedocs',
    welcomeMessage: 'Hi! I can answer questions about svedocs. Try one of the suggestions below or write your own.',
    suggestions: [
      'How do I configure the theme?',
      'How do I deploy to Cloudflare Pages?',
      'What MDX components are built in?'
    ],
    systemPrompt: 'You are the svedocs documentation assistant. Answer questions strictly from the provided documentation sources, cite the relevant pages, and clearly say when something is missing.',
    maxResults: 5
  },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文' }
    ]
  },
  source: {
    editBaseUrl: 'https://github.com/svedocs/svedocs/edit/main/apps/site'
  },
  seo: {
    defaultAuthor: 'svedocs team',
    ogImage: {
      template: 'default',
      format: 'svg',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
