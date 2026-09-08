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

需要更小的模板或 Cloudflare 绑定时，查看[选择模板](/docs/zh/installation#选择模板)。接入已有应用请跟随[安装教程](/docs/zh/installation#接入已有应用)。

## 让 agent 来搭建

如果希望编程 agent 围绕已有项目搭建文档站，可以在首页[复制现成的建站 prompt](/zh#让-agent-来搭建)，也可以打开[纯文本版本](https://svedocs.pwp.sh/prompts/build-docs.zh.txt)。

在 agent 中打开项目并粘贴 prompt。它会引导 agent 安装[官方 skills](https://github.com/backrunner/svedocs/tree/main/skills)、阅读代码、定制主题与 landing 页面、编写准确的文档、配置 SEO 并验证结果。已有偏好时，可以追加站点目录、语言、域名或托管目标。

生成的项目会在 `.agents/skills` 中附带这些技能。核心技能包括 `use-svedocs`、`configure-svedocs`、`customize-svedocs-theme` 和 `build-svedocs-landing`；添加多语言时使用 `localize-svedocs`。

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
    feed.xml/+server.ts
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
pnpm exec svedocs check --strict
pnpm build
```

`svedocs check` 会检查缺失的页面描述、重复路由和 canonical URL、失效的内部链接、缺失的锚点和资源、翻译缺口，以及可选的包导出问题。

## 准备发布

在 `svedocs.config.ts` 中设置 `site.name`、`site.description` 和 `site.url`，然后重新检查和构建。默认的 edge 构建可按 [Cloudflare 部署](/docs/zh/integrations/cloudflare)教程发布；使用静态托管时，选择[静态输出](/docs/zh/configuration#构建模式)。

## 下一步

- [安装](/docs/zh/installation)：在新项目或已有 SvelteKit 应用中接入 svedocs。
- [写作](/docs/zh/writing)：了解内容结构、frontmatter、Markdown 特性和 SVX 写作。
- [配置](/docs/zh/configuration)：调整元数据、路由、主题、搜索、AI、SEO、检查和 Cloudflare 设置。
- [集成](/docs/zh/integrations)：连接搜索、Ask AI、Cloudflare、SEO 和 OG 路由。
- [CLI](/docs/zh/reference/cli)：使用构建、检查、索引、OG、部署辅助和升级命令。
