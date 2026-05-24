---
title: 内容
description: 使用 frontmatter、GFM、KaTeX、代码块和目录提取来写文档。
order: 2
---

# 内容

svedocs 会扫描配置的内容目录中的 `.md`、`.mdx` 和 `.svx` 文件，并把它们转成页面、标题、搜索记录和元数据。

## Frontmatter

```md
---
title: 内容
description: 解释内容管线。
---
```

常见字段包括 `title`、`description`、`order`、`hidden`、`collapsed`、`icon`、`canonical`、`image`、`published` 和 `updated`。

## Markdown

- 表格、任务列表和自动链接。
- KaTeX 行内和块级公式。
- 标题锚点和自动目录提取。

## 代码块

```ts title="svedocs.config.ts" {1} focus=3
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: { name: 'svedocs' }
});
```

代码块支持语法高亮、元数据、行高亮、聚焦提示、 diff 标记、折行和复制按钮。

## Diff

```diff
- const docs = fragmented();
+ const docs = svedocs();
```

```diff split title="packages/svedocs/src/core.ts"
@@ -1,3 +1,4 @@
-export * from './content.js';
+export * from './core/content.js';
+export * from './core/navigation.js';
 export * from './config.js';
```

## 小节提取

标题会自动变成搜索目标和页面目录，所以长文档也能保持易扫读。

