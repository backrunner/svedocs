---
title: 内容
description: 使用 frontmatter、GFM、KaTeX、代码块、差异对比、链接、资源和小节提取来编写页面。
order: 2
---

# 内容

svedocs 会读取内容目录里的 `.md`、`.mdx` 和 `.svx` 文件。每个文件都会成为一个页面，并拥有自己的路由、导航项、搜索记录和 SEO 数据。

## 路由映射

默认内容根目录是：

```txt
content/docs -> /docs
content/pages -> /
```

示例：

| 文件 | 路由 |
| --- | --- |
| `content/docs/index.md` | `/docs` |
| `content/docs/writing/content.md` | `/docs/writing/content` |
| `content/docs/configuration/index.md` | `/docs/configuration` |
| `content/pages/changelog.md` | `/changelog` |

用 `index.md` 表示一个分组首页。需要侧栏分组时，用嵌套目录组织。

多语言项目需要把语言的 `path` 放在每个内容根目录的下一层。完整的文件到路由映射见[多语言](/docs/zh/configuration/i18n)。

## Frontmatter

重要页面至少应该包含 `title` 和 `description`：

```md
---
title: 内容
description: 了解内容处理流程和写作功能。
order: 2
---
```

常见字段：

| 字段 | 类型 | 作用 |
| --- | --- | --- |
| `title` | `string` | 页面标题、搜索标题、OG 标题和默认侧栏标题。 |
| `navTitle` | `string` | 更短的侧栏标题，不改变页面标题。 |
| `description` | `string` | SEO 描述、搜索摘要的默认内容和页面简介。 |
| `order` | `number` | 导航和上一篇/下一篇的排序权重。 |
| `hidden` | `boolean` | 从生成的导航和公开列表中移除。 |
| `collapsed` | `boolean` | 让导航分组默认折叠。 |
| `section` | `boolean` | 标记目录页为分组页。 |
| `icon` | `string` | 默认主题的图标提示。 |
| `canonical` | `string` | 覆盖生成的 canonical URL。 |
| `image` | `string` | Open Graph 图片 URL。 |
| `keywords` | `string[]` | SEO 和搜索元数据。 |
| `author` | `string` | 文章作者；未填写时使用 `seo.defaultAuthor`。 |
| `published`、`date`、`publishedTime` | `date` | 发布时间。 |
| `updated`、`updatedTime` | `date` | 最近一次有意义的内容更新时间。 |
| `type`、`ogType` | `string` | Open Graph 内容类型。 |

如果第一个 Markdown 标题和 `title` 一样，svedocs 会从渲染内容中移除重复标题，但保留页面标题。

## Markdown 特性

svedocs 支持 GitHub-flavored Markdown，例如表格、任务列表和自动链接。它也会提取标题，用于锚点和页面目录。

```md
## 配置搜索

- [x] 创建运行时路由。
- [x] 选择搜索服务。
- [ ] 添加生产环境凭据。
```

需要公式时，可以使用 KaTeX 行内或块级数学公式。

## 代码块

使用代码元数据可以让示例更容易扫描：

````md
```ts title="svedocs.config.ts" {1} focus=3
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: { name: 'svedocs' }
});
```
````

默认主题支持：

- 语法高亮。
- 使用 `title="..."` 或 `filename="..."` 显示文件标题。
- 使用 `{1,3-5}` 高亮行。
- 使用 `focus=3` 标记重点行。
- 通过主题配置控制行号和折行。
- 复制按钮。

## 差异对比

小修改可以使用标准 diff 代码块：

```diff
- const docs = fragmented();
+ const docs = svedocs();
```

需要左右对比时，可以使用分栏 diff：

```diff split title="packages/svedocs/src/core.ts"
@@ -1,3 +1,4 @@
-export * from './content.js';
+export * from './core/content.js';
+export * from './core/navigation.js';
 export * from './config.js';
```

分栏 diff 的左右两侧都支持横向滚动，因此在窄屏上也能查看长代码。

## 链接和资源

内部链接会根据生成的路由和标题锚点进行检查：

```md
阅读[配置](/docs/zh/configuration)，或直接跳到
[构建模式](/docs/zh/configuration#构建模式)。
```

外部链接在默认主题里会带一个小的内联图标，帮助读者区分站外跳转：

```md
阅读 [SvelteKit 文档](https://svelte.dev/docs/kit)。
```

例如，[SvelteKit 文档](https://svelte.dev/docs/kit)这个链接会被标记为站外链接。

独立一行的内部链接可以通过 `card` 标题渲染成类似 Fumadocs 的卡片式链接：

```md
[SEO 和 OG](/docs/zh/integrations/seo-og "card: 元数据、站点地图、robots、JSON-LD 和 Open Graph 路由。")
```

启用 `checks.assets` 时，本地资源也会被检查：

```md
![控制台截图](/images/dashboard.png)
```

公共资源建议使用绝对站点路径，内部链接使用稳定的文档路由。这样链接出现在搜索结果、Ask AI 引用或静态构建里时仍然有效。

## 搜索记录

svedocs 会创建两类搜索记录：

| 记录 | 来源 | 适合 |
| --- | --- | --- |
| 页面记录 | 页面标题、描述、路由和正文。 | 命中整篇页面的宽泛查询。 |
| 小节记录 | 标题和附近正文。 | 跳转到长文档中的具体小节。 |

清晰标题比堆关键词更能提升搜索质量。优先使用描述用户任务或概念的标题。

## 发布前检查

发布页面前确认：

- 页面是否有唯一的 `title` 和有用的 `description`？
- 路由应该属于 `docs`，还是应该作为独立 `page`？
- 标题是否具体到可以成为搜索目标？
- 代码示例在需要上下文时是否带了文件名？
- 内部链接是否指向真实路由和锚点？
- 页面是否需要 `canonical`、`image`、`published` 或 `updated` 元数据？
