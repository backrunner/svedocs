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
      light: 'github-light',
      dark: 'github-dark'
    },
    nav: [
      { label: 'Docs', href: '/docs' },
      { label: 'Theme', href: '/docs/theme' },
      { label: 'API', href: '/docs/api' }
    ],
    brand: {
      label: 'svedocs',
      href: '/',
      mark: 'pixel'
    },
    social: [
      { label: 'GitHub', href: 'https://github.com/svedocs/svedocs', external: true }
    ],
    footer: {
      text: 'MIT licensed. Built with the workspace version of svedocs.',
      links: [
        { label: 'Cloudflare', href: '/docs/cloudflare' },
        { label: 'SEO', href: '/docs/seo-og' }
      ]
    },
    home: {
      kicker: 'Edge-first Svelte docs',
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
    scope: 'current'
  },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文' }
    ]
  },
  versions: {
    current: 'v1',
    items: [
      { name: 'v1', label: 'Latest' },
      {
        name: 'v0',
        label: 'Legacy',
        status: 'archived',
        banner: 'This version is kept as a routing and version switching demo for svedocs. Use Latest for current APIs.'
      }
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
