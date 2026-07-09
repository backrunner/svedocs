---
title: svedocs
description: 用一个集成框架包构建边缘优先的 SvelteKit 文档站。
layout: home
---

## 从这里开始

1. 使用 `pnpm create svedocs my-docs` 创建站点。
2. 打开 `/docs/zh`，阅读[快速开始](/docs/zh)。
3. 随着项目增长，继续查看[安装](/docs/zh/installation)、[写作](/docs/zh/writing)、[配置](/docs/zh/configuration)、[集成](/docs/zh/integrations)和[参考](/docs/zh/reference)。

## 开箱包含

- 内容加载、作用域导航和搜索记录。
- Tailwind CSS v4 主题变量和默认文档外壳。
- 搜索、Ask AI、SEO、OG 和 Cloudflare 部署辅助能力都在一个包里。

## 常见流程

```sh
pnpm create svedocs my-docs
cd my-docs
pnpm install
pnpm dev
```

先让文档树保持小而清晰：安装包、编写页面、接好配置。等内容本身稳定后，再加入托管搜索或 AI。
