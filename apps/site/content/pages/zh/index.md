---
title: svedocs
description: 为 Cloudflare 或静态托管构建 SvelteKit 文档站。
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

## 常见流程

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

先从少量页面开始：安装包、编写内容并完成基础配置。等内容足够判断搜索和回答质量后，再接入托管搜索或 AI。
