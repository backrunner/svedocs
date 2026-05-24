---
title: Content
description: Author pages with frontmatter, GFM, KaTeX, code blocks, and table of contents extraction.
order: 2
---

# Content

svedocs scans `.md`, `.mdx`, and `.svx` files from configured content roots and turns them into pages, headings, search records, and metadata.

## Frontmatter

```md
---
title: Content
description: Explain the content pipeline.
---
```

The common fields are `title`, `description`, `order`, `hidden`, `collapsed`, `icon`, `canonical`, `image`, `published`, and `updated`.

## Markdown

- Tables, task lists, and autolinks.
- KaTeX for inline and block math.
- Heading anchors and automatic table of contents extraction.

## Code blocks

```ts title="svedocs.config.ts" {1} focus=3
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: { name: 'svedocs' }
});
```

Code blocks support syntax highlighting, metadata, line highlighting, focus hints, diff markers, wrapping, and copy actions in the default theme.

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

## Section extraction

Section headings become search targets and on-page navigation entries automatically, so long guides still stay easy to scan.

