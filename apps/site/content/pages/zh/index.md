---
title: svedocs
seoTitle: svedocs — 基于 SvelteKit 的文档框架
description: 用 SvelteKit 构建契合项目风格的文档站，支持定制主题、Markdown、搜索与 Agent Skills。部署到 Cloudflare 或静态托管。
image: /brand/og-home-zh.png
imageAlt: svedocs — 你的文档，你的设计。支持定制主题与 Agent Skills 的 SvelteKit 文档框架。
imageWidth: 1200
imageHeight: 630
imageType: image/png
head:
  jsonLd:
    - '@context': https://schema.org
      '@type': WebSite
      '@id': https://svedocs.pwp.sh/#website
      name: svedocs
      url: https://svedocs.pwp.sh/
      inLanguage: zh-CN
      description: 支持定制主题、搜索和 Agent Skills 的 SvelteKit 文档框架，可部署到 Cloudflare 或静态托管。
      publisher:
        '@id': https://svedocs.pwp.sh/#organization
layout: site-home
---

## 从这里开始

1. 使用 `pnpm create svedocs my-docs` 创建站点。
2. 打开 `/docs/zh`，阅读[快速开始](/docs/zh)。
3. 随着项目增长，继续查看[安装](/docs/zh/installation)、[写作](/docs/zh/writing)、[配置](/docs/zh/configuration)、[集成](/docs/zh/integrations)和[参考](/docs/zh/reference)。

## 已包含

- 内容加载、按范围过滤的导航和搜索记录。
- Tailwind CSS v4 主题变量和默认文档外壳。
- 搜索、Ask AI、SEO、OG 图片和 Cloudflare 部署工具。

## 让 agent 来搭建

在编程 agent 中打开需要编写文档的项目，然后[复制建站 prompt](#让-agent-来搭建)，或读取[完整纯文本 prompt](https://svedocs.pwp.sh/prompts/build-docs.zh.txt)。

这段 prompt 会安装 [svedocs 官方 skills](https://github.com/backrunner/svedocs/tree/main/skills)，引导 agent 理解代码和视觉风格，完成定制主题、landing 页面、真实项目文档、SEO 与浏览器验证。发送前，也可以追加你希望使用的站点目录、语言、公开域名或托管平台。

## 常见流程

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

先从少量页面开始：安装包、编写内容并完成基础配置。等内容足够判断搜索和回答质量后，再接入托管搜索或 AI。
