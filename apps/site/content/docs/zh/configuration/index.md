---
title: 配置
description: 配置站点元数据、内容目录、构建模式、搜索、AI 和 SEO。
order: 4
---

# 配置

在项目根目录创建 `svedocs.config.ts`。

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs'
  },
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages'
  },
  build: {
    mode: 'edge'
  },
  theme: {
    nav: [
      { label: '文档', href: '/docs/zh' },
      { label: '主题', href: '/docs/zh/configuration/theme' },
      { label: '参考', href: '/docs/zh/reference/api' }
    ],
    radius: '4px'
  }
});
```

## 构建模式

- `edge` 使用面向 Cloudflare 的 SSR。
- `static` 预渲染整个站点。
- `spa` 会预渲染已知页面，并在受限主机上提供静态兜底。

## 搜索和 AI

搜索和 Ask AI 都是内建能力。简单站点可以关闭它们，生产环境则可以接 Cloudflare AI Search、Algolia、Typesense、Workers AI 或 OpenAI 兼容提供商。

运行时路由会使用 `createConfiguredSearchResponse` 和 `createConfiguredAskResponse`，所以在开发环境里依然保留本地 fallback。

## 本地化

locale 作用域属于内容模型的一部分，所以路由生成、侧栏导航、SEO alternates、Ask AI 引用和搜索记录都会保持一致。

```ts title="svedocs.config.ts"
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文' }
    ]
  }
});
```

## Markdown 钩子

`markdown.remarkPlugins` 和 `markdown.rehypePlugins` 会在 manifest 编译和 Svelte 兼容的 SVX/MDX 渲染过程中运行。它们属于编译期钩子，不会被序列化到浏览器虚拟模块里。

## 来源信息

设置 `source.editBaseUrl` 就能在默认主题里显示编辑链接。svedocs 还会从源文件时间戳里记录 `lastUpdated`。

## 继续阅读

- [主题](/docs/zh/configuration/theme)
- [写作](/docs/zh/writing)
- [集成](/docs/zh/integrations)
- [参考](/docs/zh/reference)
