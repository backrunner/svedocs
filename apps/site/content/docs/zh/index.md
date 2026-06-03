---
title: 快速开始
description: 构建第一个 svedocs 站点，并在进入生产环境前理解框架的核心组成。
order: 1
---

# 快速开始

svedocs 是面向 SvelteKit 的文档框架，把文档站常见的能力放在同一套栈里：内容加载、路由、主题、搜索、Ask AI、SEO、Open Graph 图片、内容检查和 Cloudflare 部署辅助。

最好的学习方式是先生成一个项目，看看它创建了哪些文件，然后把示例内容替换成你自己的文档。

## 创建站点

```sh
pnpm create svedocs my-docs --template docs
cd my-docs
pnpm install
pnpm dev
```

打开开发服务器打印的本地地址。`docs` 模板会生成一个可运行的 SvelteKit 应用，包含文档布局、示例内容、本地搜索、Ask AI fallback 路由、站点地图、robots 和 Open Graph 路由。

如果你想从更小的范围开始，可以选择其他模板：

| 模板 | 适合场景 |
| --- | --- |
| `minimal` | 只需要最小文档外壳，后续再逐步加入集成。 |
| `docs` | 大多数产品文档站，默认带本地搜索、Ask AI fallback、SEO 和 OG 路由。 |
| `cloudflare` | 计划部署到 Cloudflare Pages，并希望一开始就带 Wrangler binding 示例。 |

## svedocs 提供什么

| 层级 | 作用 |
| --- | --- |
| 内容 | 扫描 Markdown、MDX 风格和 SVX 文件，读取 frontmatter，提取标题，校验链接，并生成页面 manifest。 |
| 导航 | 从同一个 manifest 生成侧栏、上一页/下一页、路由元数据、本地化作用域和页面目录。 |
| 主题 | 提供 Svelte 主题、Tailwind CSS v4 变量、明暗模式、代码块、diff、提示块、表单和文档布局。 |
| 搜索 | 为本地 MiniSearch、Algolia、Typesense 和 Cloudflare AI Search 生成页面和小节记录。 |
| Ask AI | 使用同一批记录提供引用，支持 mock、Cloudflare AI Search、Workers AI 和 OpenAI 兼容 provider。 |
| SEO | 生成 metadata、canonical URL、alternate、JSON-LD、sitemap、robots，以及构建期或路由形式的 OG 图片。 |
| CLI | 提供 create、dev、build、check、index、OG 生成、Cloudflare helper 和依赖升级命令。 |

## 项目结构

生成的项目会尽量保持小而清晰：

```txt
my-docs/
  content/
    docs/
      index.md
    pages/
      index.md
  src/routes/
    [...path]/+page.svelte
    api/search/+server.ts
    api/ask/+server.ts
    og/[...path]/+server.ts
    sitemap.xml/+server.ts
    robots.txt/+server.ts
  svedocs.config.ts
  vite.config.ts
  svelte.config.js
```

日常主要修改 `content/docs`、`content/pages` 和 `svedocs.config.ts`。路由文件会保持很薄：它们加载 Vite 插件生成的 virtual modules，然后交给默认主题或运行时 helper。

## 写第一篇文档

创建 `content/docs/getting-started.md`：

````md title="content/docs/getting-started.md"
---
title: Getting Started
description: Learn the first workflow in this product.
order: 2
---

# Getting Started

Use this page to explain the first successful path.

## Install

```sh
pnpm add your-package
```
````

svedocs 会把这个文件映射到 `/docs/getting-started`，加入侧栏，把 `Install` 提取成页面目录，并为页面和小节都创建搜索记录。

## 开发流程

写文档时常用这些命令：

```sh
pnpm dev
pnpm check
pnpm build
```

`svedocs check` 会检查缺失 description、重复路由、重复 canonical URL、内部链接断裂、锚点缺失、资源缺失、翻译缺口，以及可选的包导出问题。

## 上线前检查表

公开发布文档站前，建议确认：

- 已设置 `site.name`、`site.title`、`site.description` 和 `site.url`。
- 重要页面都有唯一且有用的 `description`。
- 已运行 `svedocs check --strict`。
- 已决定站点应该以 `edge`、`static` 还是 `spa` 模式构建。
- 搜索和 Ask AI 在内容稳定后再接入 provider。
- 密钥只放在环境变量或 `.dev.vars`，不要写入文档或提交到仓库。
- 公开分享的页面已经有 OG 图片路由或构建期 OG 资产。

## 下一步

- [安装](/docs/zh/installation)：在新项目或已有 SvelteKit 应用中接入 svedocs。
- [写作](/docs/zh/writing)：理解内容模型、frontmatter、Markdown 特性和 SVX 写作。
- [配置](/docs/zh/configuration)：调整元数据、路由、主题、搜索、AI、SEO、检查和 Cloudflare 设置。
- [集成](/docs/zh/integrations)：连接搜索、Ask AI、Cloudflare、SEO 和 OG 路由。
- [CLI](/docs/zh/reference/cli)：使用构建、检查、索引、OG、部署辅助和升级命令。
