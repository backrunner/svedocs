---
title: 配置
description: 配置站点元数据、内容目录、构建模式、主题、搜索、AI、SEO、检查、Cloudflare 和 i18n。
order: 4
---

# 配置

在项目根目录创建 `svedocs.config.ts`，并导出 `defineConfig`。这份配置会被 Vite 插件、CLI 命令、运行时 helper、virtual modules、检查和构建期 OG 生成共同使用。

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

`site.name` 会用于主题和元数据。`site.title` 是默认文档标题。`site.description` 是 SEO 描述 fallback。`site.url` 会启用绝对 canonical URL、sitemap URL、Open Graph URL 和 locale alternates。

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

`docs` 内容会进入文档导航。`pages` 内容会成为独立站点页面。草稿应放在 include 之外，或通过 `exclude` 明确排除。

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
| `edge` | 面向 Cloudflare 的 SSR。 | 需要 hosted search、Ask AI 或动态响应等运行时路由。 |
| `static` | 完全预渲染站点。 | 文档可以作为静态文件部署，运行时集成有 fallback。 |
| `spa` | 预渲染已知页面并提供静态 fallback。 | 受限主机需要客户端 fallback 行为。 |

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
      { label: 'Docs', href: '/docs/zh' },
      { label: 'API', href: '/docs/zh/reference/api' }
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

Provider：

| Provider | 说明 |
| --- | --- |
| `local` | 默认 MiniSearch 路由，不需要外部服务。 |
| `algolia` | 使用服务端凭据查询 Algolia 索引。 |
| `typesense` | 通过 REST provider 查询 Typesense collection。 |
| `cloudflare-ai-search` | 使用 Cloudflare AI Search binding 或 API 索引。 |

设置 `search: false` 可以从配置主题和 helper 中移除搜索。

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

Provider 包括 `mock`、`cloudflare-ai-search`、`cloudflare-workers-ai` 和 `openai-compatible`。开发阶段保留 `mock` 或本地 fallback，等内容稳定后再加入 hosted 凭据。

## SEO 和 OG

```ts
export default defineConfig({
  seo: {
    sitemap: true,
    robots: true,
    defaultAuthor: 'Acme',
    ogImage: {
      template: 'default',
      format: 'svg',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
```

设置 `seo.ogImage = false` 可以禁用自动 OG 生成。SVG 更适合 edge/runtime 输出。需要更复杂的构建期图片时，可以用 PNG 或 Satori，并显式提供字体。

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

Cloudflare 配置会被部署 helper、生成的 Wrangler 配置、平台类型、AI Search 路由和 Workers AI 路由使用。

## i18n

```ts
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    prefixDefaultLocale: false,
    locales: [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文', path: 'zh' }
    ]
  }
});
```

Locale 会影响路由生成、侧栏、搜索作用域、Ask AI 引用、SEO alternates 和翻译检查。单语言站点可以设置 `i18n: false`。

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

Markdown 钩子会在 manifest 生成和 SVX/MDX 渲染期间运行，属于编译期能力，不会序列化到浏览器 virtual modules。

## 配置顺序建议

生产站点建议按这个顺序配置：

1. `site`、`content` 和 `build`。
2. `theme` 和导航。
3. `seo`、sitemap、robots 和 OG 图片。
4. `search` 和 `ai` 的本地行为。
5. Hosted providers 和 Cloudflare bindings。
6. `checks` 和 CI 命令。

这个顺序能让第一版文档体验先跑起来，再逐步引入外部服务。
