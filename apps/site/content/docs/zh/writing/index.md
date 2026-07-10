---
title: 写作
description: 使用 Markdown、frontmatter 和 Svelte 示例来规划、组织和编写文档。
order: 3
---

# 写作

在 svedocs 里，文件目录本身就是站点结构。文件名和 frontmatter 会决定路由、侧栏顺序、页面目录、搜索结果、SEO 数据和 Ask AI 引用。

这一节介绍内容应该放在哪里，以及怎样写出容易阅读、也容易被找到的页面。

## 内容放在哪里

大多数项目会使用两个内容根目录：

| 目录 | 用途 | 路由形状 |
| --- | --- | --- |
| `content/docs` | 产品文档、指南、教程、API 解释、集成说明。 | `/docs/...` |
| `content/pages` | 首页、更新日志、独立产品页。 | `/...` |

指南和参考资料需要出现在侧栏时，放进 `docs`；首页、更新日志等独立内容放进 `pages`。

## 文件格式

| 格式 | 适合内容 |
| --- | --- |
| `.md` | 大多数文档：正文、表格、代码块、提示块、数学公式和图片。 |
| `.svx` | 需要 Svelte 组件、交互示例或更丰富局部组合的页面。 |
| `.mdx` | 偏好 MDX 扩展名时使用；svedocs 仍会通过 Svelte 兼容管线编译。 |

默认从 Markdown 开始。只有页面真的需要交互时，再切到 SVX。

## 推荐页面结构

一篇实用的文档通常包含：

1. 明确的 `title` 和 `description`。
2. 开头说明这页适合谁、解决什么问题。
3. 尽量靠前放一个可运行示例。
4. 小节按用户任务组织，而不是按内部实现组织。
5. 工作流可能失败时，补充排查或下一步。

```md title="content/docs/deploy.md"
---
title: 部署
description: 构建文档站并部署到 Cloudflare Pages。
order: 4
---

# 部署

这篇指南介绍默认的边缘部署流程。

## 构建

先运行生产构建。
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

- 使用任务型标题，例如“配置 Algolia”“部署到 Cloudflare Pages”。
- `description` 用一句话说明页面能帮用户完成什么。
- 示例尽量短，并提供真实文件名。
- 会被其他页面引用的锚点保持稳定。

避免：

- 很多页面使用相同标题。
- 大量使用“用法”“选项”“更多”这类含义宽泛的标题。
- 放很长代码块但没有解释。
- 把本该被搜索发现的页面设成 `hidden`。

## 本节内容

- [内容](/docs/zh/writing/content)：frontmatter、Markdown 特性、代码块、差异对比、链接、资源和小节提取。
- [组件](/docs/zh/writing/components)：Svelte 组件、自定义布局和主题组合。

## 文档工作流

写文档时建议使用这个循环：

```sh
pnpm dev
pnpm check
pnpm build
```

定期运行 `pnpm check`。它能在站点变大之前发现断链、路由冲突和缺失的元数据。
