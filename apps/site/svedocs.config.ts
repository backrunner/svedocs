import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'svedocs',
    title: 'svedocs',
    description: 'Documentation sites built with SvelteKit.',
    url: 'https://svedocs.pwp.sh'
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
      { label: 'Docs', labelKey: 'nav.docs', href: '/docs' },
      { label: 'Configuration', labelKey: 'nav.configuration', href: '/docs/configuration' },
      { label: 'API', labelKey: 'nav.api', href: '/docs/reference/api' }
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
        { label: 'GitHub', href: 'https://github.com/backrunner/svedocs', external: true }
      ]
    },
    home: {
      kicker: '',
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
    systemPrompt: 'You are the svedocs documentation assistant. Answer questions strictly from the provided documentation sources, cite the relevant pages, and clearly say when something is missing.',
    maxResults: 5
  },
  agent: {
    enabled: true,
    negotiation: {
      enabled: true
    }
  },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', label: 'English', hreflang: 'en', dir: 'ltr' },
      { code: 'zh', label: '中文', hreflang: 'zh-CN', dir: 'ltr' }
    ],
    messages: {
      en: {
        'ask.placeholder': 'Ask anything about svedocs',
        'ask.welcome': 'Ask a question about the docs. Answers include links to their sources.',
        'ask.suggestion.1': 'How do I configure the theme?',
        'ask.suggestion.2': 'How do I deploy to Cloudflare Pages?',
        'ask.suggestion.3': 'What MDX components are built in?',
        'footer.text': 'Made by Alkinum with ♥'
      },
      zh: {
        'nav.primary': '主导航',
        'nav.docs': '文档',
        'nav.configuration': '配置',
        'nav.api': 'API',
        'nav.documentation': '文档导航',
        'nav.footer': '页脚',
        'nav.social': '社交链接',
        'nav.mobile.open': '打开菜单',
        'nav.mobile.close': '关闭菜单',
        'nav.skipToContent': '跳到正文',
        'scope.group': '文档范围',
        'scope.locale': '语言',
        'scope.localeOptions': '语言选项',
        'scope.langShort': '语言',
        'search.trigger': '搜索',
        'search.dialog': '搜索文档',
        'search.query': '搜索关键词',
        'search.placeholder': '搜索文档',
        'search.results': '搜索结果',
        'search.loading': '正在搜索...',
        'search.loadingIndex': '正在加载搜索索引...',
        'search.indexError': '无法加载搜索索引。',
        'search.remoteFallback': '{error} 正在显示本地结果。',
        'search.empty': '还没有匹配的文档。',
        'search.fetchUnavailable': '当前环境无法发起搜索请求。',
        'search.requestError': '搜索请求返回 {status}。',
        'search.failed': '搜索失败。',
        'ask.label': '问 AI',
        'ask.placeholder': '询问 svedocs 文档',
        'ask.welcome': '输入文档相关的问题，回答会附上来源链接。',
        'ask.empty': '可以询问这些文档里的任何内容。',
        'ask.newChat': '新对话',
        'ask.close': '关闭',
        'ask.thinking': '思考中',
        'ask.send': '发送',
        'ask.suggestion.1': '如何配置主题？',
        'ask.suggestion.2': '如何部署到 Cloudflare Pages？',
        'ask.suggestion.3': '内置了哪些 MDX 组件？',
        'ask.fetchUnavailable': '当前环境无法发起 Ask AI 请求。',
        'ask.requestError': 'Ask AI 请求返回 {status}。',
        'ask.failed': 'Ask AI 请求失败。',
        'ask.streamUnreadable': 'Ask AI 返回了无法读取的流式事件。',
        'ask.localSource': '我在这份文档里找到 1 个相关来源。',
        'ask.localSources': '我在这份文档里找到 {count} 个相关来源。',
        'ask.localEmpty': '没有找到匹配这个问题的本地来源。',
        'ask.fallbackSource': '我找到 1 个相关来源。连接 {provider} provider 后，可以用托管 Ask AI 回答替换这条本地草稿。',
        'ask.fallbackSources': '我找到 {count} 个相关来源。连接 {provider} provider 后，可以用托管 Ask AI 回答替换这条本地草稿。',
        'ask.fallbackReady': 'Ask AI 已准备好。连接 {provider} 并索引文档后，就能基于引用回答这个问题。',
        'ask.sourceTitle': '来源 {index}',
        'toc.label': '本页内容',
        'heading.anchor': '链接到此章节',
        'article.kind.doc': '文档',
        'article.kind.page': '页面',
        'article.breadcrumb': '面包屑',
        'article.updated': '更新于 {date}',
        'article.edit': '编辑此页',
        'article.previous': '上一页',
        'article.next': '下一页',
        'code.copy': '复制代码',
        'code.copied': '已复制',
        'code.copyDiff': '复制 diff',
        'diff.label': 'Diff',
        'diff.aria': '{title} diff',
        'diff.before': '之前',
        'diff.after': '之后',
        'tools.label': '页面工具',
        'tools.backToTop': '回到顶部',
        'theme.switch': '切换到{mode}主题',
        'theme.light': '浅色',
        'theme.dark': '深色',
        'home.primaryAction': '阅读文档',
        'home.features': '文档入口',
        'home.card.start.label': '开始',
        'home.card.start.title': '快速开始',
        'home.card.start.description': '创建站点、打开文档路由，然后进入生成好的文档树。',
        'home.card.install.label': '安装',
        'home.card.install.title': '手动安装',
        'home.card.install.description': '把 svedocs 加到现有 SvelteKit 应用，并接入 Vite 插件和主题样式。',
        'home.card.write.label': '写作',
        'home.card.write.title': '内容写作',
        'home.card.write.description': '在同一棵内容树里使用 Markdown、frontmatter 和 Svelte 组件。',
        'home.card.integrate.label': '集成',
        'home.card.integrate.title': '集成能力',
        'home.card.integrate.description': '在内容稳定后加入搜索、Ask AI、Cloudflare 部署、SEO 和 OG 资源。',
        'error.notFound.title': '页面未找到',
        'error.notFound.description': '这个文档集中没有你正在查找的页面。',
        'error.generic.title': '出了点问题',
        'error.generic.description': '页面恢复期间，文档外壳仍可使用。',
        'error.status': '错误 {status}',
        'error.home': '首页',
        'error.docs': '文档',
        'render.label': '渲染问题',
        'render.title': '这个区域无法渲染',
        'render.message': '文档的这一部分渲染失败，其余内容仍可使用。',
        'render.details': '技术细节',
        'render.tryAgain': '重试',
        'render.reload': '重新加载页面',
        'render.docsHome': '文档首页',
        'render.layout.label': '布局问题',
        'render.layout.title': '页面布局无法渲染',
        'render.layout.message': '布局组件渲染失败。默认站点外壳仍可使用。',
        'render.header.label': '页头问题',
        'render.header.title': '页头无法渲染',
        'render.header.message': '页面内容仍在下方可用。你可以重试页头或使用正文内的链接。',
        'render.ask.label': '问 AI 问题',
        'render.ask.title': '问 AI 无法渲染',
        'render.ask.message': '文章仍可阅读。需要时可以稍后重试问 AI。',
        'render.tools.label': '页面工具问题',
        'render.tools.title': '页面工具无法渲染',
        'render.tools.message': '页面工具渲染失败，文档内容不受影响。',
        'render.footer.label': '页脚问题',
        'render.footer.title': '页脚无法渲染',
        'render.footer.message': '页脚链接渲染失败，上方页面内容仍可使用。',
        'render.page.label': '页面渲染问题',
        'render.page.title': '这个页面无法渲染',
        'render.page.message': '页面内容渲染失败。你可以重试此区域或重新加载页面。',
        'render.article.label': '文章渲染问题',
        'render.article.title': '这篇文章无法渲染',
        'render.article.message': '文章内容渲染失败。导航和页面工具仍可使用。',
        'render.docs.label': '文档布局问题',
        'render.docs.title': '文档布局无法渲染',
        'render.docs.message': '布局组件渲染失败。你可以重试此区域，或用顶部导航继续浏览。',
        'render.home.label': '首页内容问题',
        'render.home.title': '首页内容无法渲染',
        'render.home.message': '首页内容渲染失败，站点其余部分仍可使用。',
        'render.error.label': '错误页问题',
        'render.error.title': '错误页无法渲染',
        'render.error.message': '自定义错误页组件渲染失败。默认站点外壳仍可使用。',
        'render.custom.label': '自定义布局问题',
        'render.custom.title': '自定义布局无法渲染',
        'render.custom.message': '自定义页面布局渲染失败。路由已加载，修复组件后可重试。',
        'render.navigation.label': '导航问题',
        'render.navigation.title': '导航无法渲染',
        'render.navigation.message': '页面内容仍可使用。你可以重试导航区域或使用顶部导航。',
        'render.outline.label': '目录问题',
        'render.outline.title': '目录无法渲染',
        'render.outline.message': '目录渲染失败，但文章仍可阅读。',
        'render.errorUi.label': '错误边界问题',
        'render.errorUi.title': '错误 UI 无法渲染',
        'render.errorUi.message': '自定义错误组件渲染失败，已显示默认恢复 UI。',
        'footer.text': '由 Alkinum 制作'
      }
    }
  },
  source: {
    editBaseUrl: 'https://github.com/backrunner/svedocs/edit/main/apps/site'
  },
  seo: {
    defaultAuthor: 'svedocs team',
    rss: {
      title: 'svedocs updates',
      description: 'Documentation and release updates from svedocs.',
      limit: 50,
      locale: 'en'
    },
    ogImage: {
      template: 'default',
      format: 'svg',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
