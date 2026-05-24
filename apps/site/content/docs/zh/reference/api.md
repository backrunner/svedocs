---
title: 公开 API
description: 查看 svedocs 集成框架包对外暴露的稳定导出。
order: 3
---

# 公开 API

svedocs 把公开入口文件保持得很小。内部能力都放在子目录里，但使用方应该从稳定的包路径导入。

## Config

```ts
import { defineConfig, loadSvedocsConfig } from 'svedocs/config';
```

`defineConfig` 用来拿类型提示，`loadSvedocsConfig` 用来读解析后的默认值。

## Vite

```ts
import { svedocs } from 'svedocs/vite';
```

这个插件提供虚拟模块、内容刷新、MDX/SVX 组件编译、注入式作者组件和命名布局注册。

编译期 Markdown hooks 放在 `svedocs.config.ts` 里：

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

这些 hooks 会用于 manifest 编译和 Svelte-compatible `.svx/.mdx` 渲染，但不会被序列化进浏览器虚拟模块。

虚拟模块：

| 模块 | 内容 |
| --- | --- |
| `virtual:svedocs/config` | 解析后的配置 |
| `virtual:svedocs/pages` | 页面 manifest |
| `virtual:svedocs/tree` | 侧栏树 |
| `virtual:svedocs/search` | 搜索记录 |
| `virtual:svedocs/components` | 编译后的 `.svx/.mdx` 组件 |
| `virtual:svedocs/layouts` | 注册的自定义布局 |

## Core

```ts
import {
  loadSvedocsContent,
  createPageTree,
  createSearchRecords,
  checkSvedocsContent
} from 'svedocs/core';
```

Core API 暴露的是 manifest、内容模型、导航、链接、检查和搜索记录。页面 metadata 会带上 locale 作用域，方便翻译文档使用。

## Theme

```ts
import { DocsApp, RootLayout, DocsLayout, DocPage, HomePage } from 'svedocs/theme';
import 'svedocs/theme/styles.css';
```

完整路由壳层可以直接用 `DocsApp`，也可以组合更底层的组件做自定义站点。

## Cloudflare

```ts
import { createCloudflarePreset, createWranglerJsonc, createCloudflareEnvDts } from 'svedocs/cloudflare';
```

这些辅助函数会对齐 SvelteKit build mode、`wrangler.toml` / `wrangler.jsonc`，以及平台 binding 类型。

## Search 和 AI

```ts
import { createConfiguredSearchResponse, createSearchResponse, searchRecords } from 'svedocs/search';
import { createConfiguredAskResponse, createAskResponse, createMemoryRateLimiter } from 'svedocs/ai';
```

Search 和 Ask AI 都是内建能力，支持本地、Algolia、Typesense、Cloudflare 相关和 OpenAI-compatible 提供商。local search 只接受 locale 和 kind 作用域。

生成路由时优先用 configured response helpers。只有在你要自定义路由或 provider 选择时，才直接 import `createAlgoliaSearchProvider`、`createTypesenseSearchProvider`、`createCloudflareAiSearchProvider`、`createWorkersAiProvider` 或 `createOpenAiCompatibleProvider`。

## OG

```ts
import {
  createPageMetadata,
  createPageAlternates,
  createSitemapXml,
  createRobotsTxt,
  createPageOgImageResponse,
  createOgImageInput,
  createOgImage
} from 'svedocs/og';
```

这些 API 适合自定义 route handler、自定义布局和构建期 OG 生成。
