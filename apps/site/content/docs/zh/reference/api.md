---
title: 公开 API
description: 查阅 svedocs 对外提供的稳定导出。
order: 3
---

# 公开 API

请从下面列出的包路径导入公开 API。即使内部实现以后在子目录间调整，这些入口也会保持精简和稳定。

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

编译期 Markdown 钩子放在 `svedocs.config.ts` 中：

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

这些钩子会在 svedocs 构建页面列表并渲染兼容 Svelte 的 `.svx/.mdx` 文件时运行，不会被序列化进浏览器虚拟模块。

虚拟模块：

| 模块 | 内容 |
| --- | --- |
| `virtual:svedocs/config` | 解析后的配置 |
| `virtual:svedocs/pages` | 完整页面列表 |
| `virtual:svedocs/page-index` | 用于客户端路由匹配的轻量页面索引 |
| `virtual:svedocs/page-loaders` | 完整单页数据的动态加载器 |
| `virtual:svedocs/tree` | 侧栏树 |
| `virtual:svedocs/search` | 搜索记录 |
| `virtual:svedocs/search-loader` | 客户端搜索记录的动态加载器 |
| `virtual:svedocs/components` | 编译后的 `.svx/.mdx` 组件 |
| `virtual:svedocs/layouts` | 注册的自定义布局 |
| `virtual:svedocs/theme-components` | 注册的主题组件替换 |

## Core

```ts
import {
  loadSvedocsContent,
  createPageTree,
  createSearchRecords,
  checkSvedocsContent
} from 'svedocs/core';
import { resolveSvedocsPageRoute, resolveSvedocsHref } from 'svedocs/routes';
```

核心 API 包含内容加载、导航、链接、检查和搜索记录。浏览器安全的 `svedocs/routes` 入口提供 `resolveSvedocsPageRoute`，用于加载 canonical 路由并处理默认语言重定向；`resolveSvedocsHref` 对链接应用同一套语言规则。

## Theme

```ts
import {
  DocsApp,
  RootLayout,
  LayoutShell,
  DocsLayout,
  DocsShell,
  DocPage,
  Article,
  PageLayout,
  PageShell,
  ErrorPage,
  RenderError,
  Navbar,
  TableOfContents,
  Footer,
  PageTools,
  HomePage,
  ThemeInit,
  FormField,
  Input,
  Select,
  Textarea,
  Checkbox,
  Button,
  LocalizedLink
} from 'svedocs/theme';
import 'svedocs/theme/styles.css';
import 'svedocs/theme/base.css';
import { createSearchController, createAskAiController } from 'svedocs/theme/headless';
import type { SvedocsThemeComponentMap, SvedocsNavbarProps } from 'svedocs/theme/types';
```

完整的路由外壳可以直接使用 `DocsApp`，也可以组合更底层的组件构建自定义站点。
自定义页面和布局中的表单可以使用这些基础控件，以继承 svedocs 默认主题。
开发完整的自定义主题时，可以通过 `themeComponents` 替换默认组件，并复用无样式控制器。每个组件的属性见[组件](/docs/zh/reference/theme-components)。

## Cloudflare

```ts
import { createCloudflarePreset, createWranglerJsonc, createCloudflareEnvDts } from 'svedocs/cloudflare';
```

这些辅助函数会协调 SvelteKit 构建模式、`wrangler.toml` 或 `wrangler.jsonc`，以及平台绑定类型。

## Search 和 AI

```ts
import { createConfiguredSearchResponse, createSearchResponse, searchRecords } from 'svedocs/search';
import { createConfiguredAskResponse, createAskResponse, createMemoryRateLimiter } from 'svedocs/ai';
```

搜索和 Ask AI 支持本地、Algolia、Typesense、Cloudflare 和 OpenAI 兼容服务。本地搜索可以按语言和内容类型过滤结果。

生成的路由应优先使用配置感知的响应函数。只有需要自定义路由或服务选择时，才直接导入 `createAlgoliaSearchProvider`、`createTypesenseSearchProvider`、`createCloudflareAiSearchProvider`、`createWorkersAiProvider` 或 `createOpenAiCompatibleProvider`。

## OG

```ts
import {
  createPageMetadata,
  createPageAlternates,
  createSitemapXml,
  createSitemapResponse,
  createRobotsTxt,
  createRssXml,
  createRssResponse,
  createPageOgImageResponse,
  createOgImageInput,
  createOgImage
} from 'svedocs/og';
```

这些 API 可用于自定义路由处理函数、布局和构建期 OG 图片生成。
