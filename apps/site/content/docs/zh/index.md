---
title: 快速开始
description: 几分钟内启动 svedocs，并了解它的核心组成。
order: 1
---

# 快速开始

svedocs 是一个面向 SvelteKit 的文档框架，把内容加载、主题、搜索、Ask AI、SEO、OG 图片和 Cloudflare 部署辅助能力放在同一个包里。

## 安装

```sh
pnpm add svedocs
pnpm add -D svedocs-cli
```

## 创建站点

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

## 你会得到什么

| 能力 | 默认提供 |
| --- | --- |
| 内容 | Markdown、SVX/MDX 风格写作、frontmatter、代码元数据、作用域导航 |
| 主题 | Tailwind CSS v4 主题变量、明暗模式、布局组件 |
| 部署 | Cloudflare edge SSR、静态输出、SPA 兜底 |
| 搜索 | 本地 MiniSearch、Algolia、Typesense、Cloudflare AI Search |
| Ask AI | Mock、Cloudflare AI Search、Workers AI、OpenAI 兼容提供商、引用和限流 |
| SEO | 元数据、JSON-LD、站点地图、robots、OG 资产 |

## 下一步

- 如果你在接入已有 SvelteKit 项目，请先看[安装](/docs/zh/installation)。
- 想了解作者模型，请看[写作](/docs/zh/writing)。
- 想看配置项，请看[配置](/docs/zh/configuration)。
- 想接搜索、AI、部署和 SEO，请看[集成](/docs/zh/integrations)。

## 常见问题

- 新项目直接用 `pnpm create svedocs`。
- 现有项目先执行 `pnpm add svedocs` 和 `pnpm add -D svedocs-cli`。
- 想快速体验，就先把文档树跑起来，再补搜索和 OG。
