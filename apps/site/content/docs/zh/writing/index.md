---
title: 写作
description: 使用 Markdown、frontmatter 和 Svelte 示例来规划、组织和编写文档。
order: 3
---

# 写作

svedocs 把文档看作一个内容系统，而不是一堆页面。每个源文件都会变成路由数据、侧栏导航、页面目录、搜索记录、SEO 元数据，以及可选的 Ask AI 引用来源。

这一节会说明如何写出对读者有帮助、同时对框架可预测的文档。

## 作者模型

大多数项目会使用两个内容根目录：

| 目录 | 用途 | 路由形状 |
| --- | --- | --- |
| `content/docs` | 产品文档、指南、教程、API 解释、集成说明。 | `/docs/...` |
| `content/pages` | 首页、changelog、独立产品页。 | `/...` |

需要进入侧栏并参与上一页/下一页导航的内容，放在 docs。仍然由 svedocs 渲染但更独立的内容，放在 pages。

## 文件格式

| 格式 | 适合内容 |
| --- | --- |
| `.md` | 大多数文档：正文、表格、代码块、提示块、数学公式和图片。 |
| `.svx` | 需要 Svelte 组件、交互示例或更丰富局部组合的页面。 |
| `.mdx` | 偏好 MDX 扩展名时使用；svedocs 仍会通过 Svelte 兼容管线编译。 |

默认从 Markdown 开始。只有页面真的需要交互时，再切到 SVX。

## 推荐页面结构

一篇好的文档通常包含：

1. 明确的 `title` 和 `description`。
2. 开头说明这页适合谁、解决什么问题。
3. 尽量靠前放一个可运行示例。
4. 小节按用户任务组织，而不是按内部实现组织。
5. 工作流可能失败时，补充排查或下一步。

```md title="content/docs/deploy.md"
---
title: Deploy
description: Build and deploy the docs site to Cloudflare Pages.
order: 4
---

# Deploy

This guide shows the default edge deployment path.

## Build

Run the production build first.
```

## 导航和排序

侧栏会从文件树和 frontmatter 生成：

- `order` 让页面或分组排在字母排序前面。
- `navTitle` 可以缩短侧栏标题，但不改变页面标题。
- `collapsed` 控制分组默认是否折叠。
- `hidden` 会把页面从导航和生成的公开列表里移除。
- `icon` 会给默认主题一个图标提示。

目录首页很重要。例如 `content/docs/configuration/index.md` 表示 `/docs/configuration` 这个分组首页。

## 搜索和 Ask AI 质量

搜索记录来自页面和标题。Ask AI 引用也使用这些记录，所以清晰的标题会直接提升检索质量。

推荐：

- 使用任务型标题，例如 `Configure Algolia`、`Deploy to Cloudflare Pages`。
- `description` 用一句话说明页面能帮用户完成什么。
- 示例尽量短，并提供真实文件名。
- 会被其他页面引用的锚点保持稳定。

避免：

- 很多页面使用相同标题。
- 大量使用 `Usage`、`Options`、`More` 这类泛泛标题。
- 放很长代码块但没有解释。
- 把本该被搜索发现的页面设成 `hidden`。

## 本节内容

- [内容](/docs/zh/writing/content)：frontmatter、Markdown 特性、代码块、diff、链接、资源和小节提取。
- [组件](/docs/zh/writing/components)：Svelte 组件、自定义布局和主题组合。

## 文档工作流

写文档时建议使用这个循环：

```sh
pnpm dev
pnpm check
pnpm build
```

经常运行 `pnpm check`。它比浏览器检查更早发现内容问题，也能在文档增长时持续保持导航、链接、搜索记录和 SEO 元数据健康。
