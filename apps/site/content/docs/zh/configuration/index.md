---
title: 配置
description: 配置站点信息、内容目录、构建模式、主题、搜索、AI、SEO、检查、Cloudflare 和多语言。
order: 4
---

# 配置

站点的大部分行为都在项目根目录的 `svedocs.config.ts` 中配置。通过 `defineConfig` 导出后，Vite 插件、CLI、运行时工具、内容检查和 OG 图片生成都会读取同一份设置。

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs',
    url: 'https://example.com'
  },
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages'
  },
  build: {
    mode: 'edge'
  }
});
```

## 站点元数据

```ts
export default defineConfig({
  site: {
    name: 'Acme Docs',
    title: 'Acme Docs',
    description: 'Guides and API references for Acme.',
    url: 'https://docs.acme.com'
  }
});
```

主题会显示 `site.name`，`site.title` 则是默认的文档标题。页面没有单独填写描述时，会使用 `site.description`。公开站点还应设置 `site.url`，这样 canonical 链接、站点地图、Open Graph URL 和多语言 alternate 链接才能使用绝对地址。

## 内容目录

```ts
export default defineConfig({
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages',
    include: ['**/*.{md,mdx,svx}'],
    exclude: ['**/_drafts/**']
  }
});
```

`docs` 下的内容会进入文档导航，`pages` 下的内容则会生成独立页面。草稿可以放在 `include` 不匹配的位置，也可以通过 `exclude` 明确排除。

## 构建模式

```ts
export default defineConfig({
  build: {
    mode: 'edge'
  }
});
```

| 模式 | 输出 | 适合场景 |
| --- | --- | --- |
| `edge` | 面向 Cloudflare 的 SSR。 | 需要托管搜索、Ask AI 或其他动态响应。 |
| `static` | 完全预渲染站点。 | 文档可以作为静态文件部署，运行时功能也有本地替代方案。 |
| `spa` | 预渲染已知页面，并提供一个静态回退页。 | 部署平台受限，需要使用客户端路由。 |

可以通过 `SVEDOCS_BUILD_MODE` 或 `svedocs build --mode <mode>` 覆盖配置。

## 主题

```ts
export default defineConfig({
  theme: {
    defaultMode: 'system',
    palette: {
      accent: '#3f7df6',
      neutral: '#737373'
    },
    fonts: {
      sans: 'Inter',
      mono: 'JetBrains Mono'
    },
    radius: '4px',
    codeTheme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    code: {
      lineNumbers: true,
      wrap: false
    },
    brand: {
      label: 'Acme',
      href: '/',
      logo: '/logo.svg',
      mark: 'pixel'
    },
    nav: [
      { label: 'Docs', labelKey: 'nav.docs', href: '/docs' },
      { label: 'API', labelKey: 'nav.api', href: '/docs/reference/api' }
    ],
    social: [
      { label: 'GitHub', href: 'https://github.com/acme/docs', external: true }
    ],
    footer: {
      text: 'Built with svedocs',
      links: [{ label: 'Status', href: '/status' }]
    }
  }
});
```

主题配置会被默认组件和 CSS 变量使用。更深入的样式说明见[主题](/docs/zh/configuration/theme)。

## 搜索

```ts
export default defineConfig({
  search: {
    enabled: true,
    provider: 'local',
    scope: 'current'
  }
});
```

可选服务：

| 配置值 | 说明 |
| --- | --- |
| `local` | 默认 MiniSearch 路由，不需要外部服务。 |
| `algolia` | 使用服务端凭据查询 Algolia 索引。 |
| `typesense` | 通过 REST 查询 Typesense 集合。 |
| `cloudflare-ai-search` | 使用 Cloudflare AI Search 绑定或索引 API。 |

设置 `search: false` 可以从主题和相关运行时工具中移除搜索。

## Ask AI

```ts
export default defineConfig({
  ai: {
    enabled: true,
    provider: 'mock',
    label: 'Ask AI',
    placeholder: 'Ask about these docs...',
    suggestions: [
      'How do I deploy to Cloudflare?',
      'How do I configure search?'
    ],
    maxResults: 6
  }
});
```

可选值包括 `mock`、`cloudflare-ai-search`、`cloudflare-workers-ai` 和 `openai-compatible`。`mock` 不需要凭据，适合一边写内容一边调试界面；等内容和提问流程稳定后，再接入托管服务测试真实回答。

## SEO 和 OG

```ts
export default defineConfig({
  seo: {
    sitemap: true,
    robots: true,
    defaultAuthor: 'Acme',
    head: {
      meta: [
        { name: 'google-site-verification', content: 'verification-token' }
      ],
      links: [
        { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml', title: 'RSS' }
      ],
      jsonLd: [
        { '@type': 'Organization', name: 'Acme' }
      ]
    },
    ogImage: {
      template: 'default',
      format: 'svg',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
```

设置 `seo.ogImage = false` 可以关闭自动 OG 图片生成。SVG 适合边缘运行时直接输出；如果需要更丰富的构建期图片，可以使用 PNG 或 Satori，并显式提供字体。

`seo.head` 用来添加每个页面都需要的可序列化 `<head>` 内容，例如站点验证标签、Feed 链接、预加载链接和组织级 JSON-LD。页面 frontmatter 也可以定义 `head`，补充只属于当前页面的内容。

## 源码链接

```ts
export default defineConfig({
  source: {
    editBaseUrl: 'https://github.com/acme/docs/edit/main'
  }
});
```

默认主题可以用它显示编辑链接。svedocs 也会把文件时间戳记录成 `lastUpdated` 元数据。

## 检查

```ts
export default defineConfig({
  checks: {
    assets: true,
    externalLinks: false,
    translations: true
  }
});
```

检查通过 `svedocs check` 运行。外链检查需要网络访问，也会让 CI 变慢，所以应该有意识地开启。

## Cloudflare

```ts
export default defineConfig({
  cloudflare: {
    compatibilityDate: '2026-05-18',
    aiSearch: {
      binding: 'SVEDOCS_AI_SEARCH',
      instanceName: 'acme-docs',
      remote: false
    }
  }
});
```

这些 Cloudflare 设置会用于部署工具、生成的 Wrangler 配置、平台类型、AI Search 路由和 Workers AI 路由。

## 多语言

```ts
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    prefixDefaultLocale: false,
    locales: [
      { code: 'en', label: 'English', hreflang: 'en', dir: 'ltr' },
      { code: 'zh', label: '中文', path: 'zh', hreflang: 'zh-CN', dir: 'ltr' }
    ],
    messages: {
      zh: {
        'search.placeholder': '搜索文档',
        'ask.label': '问 AI',
        'home.primaryAction': '阅读文档'
      }
    }
  }
});
```

语言设置会影响路由、侧栏、搜索范围、Ask AI 引用、SEO alternate 链接和翻译检查。`hreflang` 会用于 `<link rel="alternate">`、站点地图、Open Graph 语言标签和 JSON-LD `inLanguage`。从右向左书写的语言还需要把 `dir` 设为 `rtl`。

`i18n.messages` 用来翻译正文之外的界面，包括导航、搜索、Ask AI、目录、文章操作、代码复制按钮、首页卡片、错误提示和页脚。英文是基础文案，即使设置了 `i18n: false` 也仍然可用；其他语言只需覆盖有差异的键。

内容目录、路由映射、自定义文案键、多语言链接、SEO 行为和翻译检查的完整说明见[多语言](/docs/zh/configuration/i18n)。

## Markdown 钩子

```ts
export default defineConfig({
  markdown: {
    remarkPlugins: [],
    rehypePlugins: [],
    shiki: {
      transformers: []
    }
  }
});
```

Markdown 钩子会在编译页面清单以及渲染 SVX/MDX 时运行，不会被序列化到浏览器虚拟模块中。

## 推荐配置顺序

新建生产站点时，可以按下面的顺序推进，每一步都比较容易验证：

1. `site`、`content` 和 `build`。
2. `theme` 和导航。
3. `seo`、sitemap、robots 和 OG 图片。
4. `search` 和 `ai` 的本地行为。
5. 托管服务和 Cloudflare 绑定。
6. `checks` 和 CI 命令。

完成第四步时，站点已经可以在本地完整使用；后两步再处理外部服务和 CI。
