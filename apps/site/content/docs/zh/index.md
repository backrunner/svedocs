---
title: 快速开始
description: 创建第一个 svedocs 站点，了解项目结构，并完成上线前的必要配置。
order: 1
---

# 快速开始

svedocs 负责 SvelteKit 应用中与文档有关的部分：Markdown 内容、路由和导航、主题、搜索、Ask AI、SEO、Open Graph 图片、内容检查和 Cloudflare 部署。

最快的上手方式是先生成一个项目，再把示例页面换成自己的内容。

## 创建站点

```sh
pnpm create svedocs my-docs --template docs
cd my-docs
pnpm install
pnpm dev
```

打开开发服务器打印的本地地址。`docs` 模板已经可以直接使用，里面有示例页面、本地搜索、无需凭据也能工作的 Ask AI 路由、站点地图、robots 和 Open Graph 图片。

如果你想从更小的范围开始，可以选择其他模板：

| 模板 | 适合场景 |
| --- | --- |
| `minimal` | 只需要一个小型文档外壳，其他功能以后再加。 |
| `docs` | 希望一开始就配好搜索、Ask AI、SEO 和 OG 路由。 |
| `cloudflare` | 计划部署到 Cloudflare Pages，并希望模板里直接带 Wrangler 绑定示例。 |

## 模板里有什么

| 功能 | 作用 |
| --- | --- |
| 内容 | 读取 Markdown、MDX 风格和 SVX 文件，包括 frontmatter、标题和链接。 |
| 导航 | 根据内容目录生成侧栏、上一页/下一页、多语言路由和页面目录。 |
| 主题 | 提供 Svelte 主题、Tailwind CSS v4 变量、明暗模式、代码块、差异对比、提示块、表单和文档布局。 |
| 搜索 | 为本地 MiniSearch、Algolia、Typesense 和 Cloudflare AI Search 生成页面和小节记录。 |
| Ask AI | 使用搜索记录作为引用，支持本地回答、Cloudflare AI Search、Workers AI 和 OpenAI 兼容服务。 |
| SEO | 生成 canonical URL、多语言 alternate、JSON-LD、sitemap、robots 和 OG 图片。 |
| CLI | 用来创建、检查、构建、索引、升级和部署文档项目。 |

## 项目结构

生成的项目结构很小：

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

平时主要修改 `content/docs`、`content/pages` 和 `svedocs.config.ts`。路由文件只负责把 Vite 插件生成的数据接到主题和服务端接口上，通常不用改。

## 写第一篇文档

创建 `content/docs/getting-started.md`：

````md title="content/docs/getting-started.md"
---
title: 开始使用
description: 完成产品的第一个常用操作。
order: 2
---

# 开始使用

这篇文档介绍最短的上手流程。

## 安装

```sh
pnpm add your-package
```
````

svedocs 会把这个文件映射到 `/docs/getting-started`，加入侧栏，把“安装”提取到页面目录中，并为整篇页面和这个小节分别创建搜索记录。

## 开发流程

写文档时，把这几个命令放进日常流程：

```sh
pnpm dev
pnpm check
pnpm build
```

`svedocs check` 会检查缺失的页面描述、重复路由和 canonical URL、失效的内部链接、缺失的锚点和资源、翻译缺口，以及可选的包导出问题。

## 上线前检查表

公开发布文档站前，建议确认：

- 已设置 `site.name`、`site.title`、`site.description` 和 `site.url`。
- 重要页面都有唯一且有用的 `description`。
- 已运行 `svedocs check --strict`。
- 已决定站点应该以 `edge`、`static` 还是 `spa` 模式构建。
- 内容稳定后，再为搜索和 Ask AI 接入托管服务。
- 密钥只放在环境变量或 `.dev.vars`，不要写入文档或提交到仓库。
- 公开分享的页面已经有 OG 图片路由或构建期 OG 资产。

## 下一步

- [安装](/docs/zh/installation)：在新项目或已有 SvelteKit 应用中接入 svedocs。
- [写作](/docs/zh/writing)：了解内容结构、frontmatter、Markdown 特性和 SVX 写作。
- [配置](/docs/zh/configuration)：调整元数据、路由、主题、搜索、AI、SEO、检查和 Cloudflare 设置。
- [集成](/docs/zh/integrations)：连接搜索、Ask AI、Cloudflare、SEO 和 OG 路由。
- [CLI](/docs/zh/reference/cli)：使用构建、检查、索引、OG、部署辅助和升级命令。
