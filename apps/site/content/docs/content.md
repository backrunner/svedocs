---
title: Content
description: Author pages with frontmatter, GFM, KaTeX, code blocks, and table of contents extraction.
---

# Content

svedocs scans `.md`, `.mdx`, and `.svx` files from configured content roots.

## Frontmatter

```md
---
title: Content
description: Explain the content pipeline.
---
```

## GFM

- [x] Tables
- [x] Task lists
- [x] Autolinks

| Capability | Default behavior | Long-form notes |
| --- | --- | --- |
| Page manifest | Each content file becomes a typed `SvedocsPage` with route, SEO metadata, headings, search text, previous and next links. | Wide tables keep a solid panel background and scroll horizontally instead of pushing the whole document shell out of view. |
| Search records | Pages and sections are extracted into structured records for local, Algolia, Typesense, and Cloudflare providers. | Long cell content wraps inside the cell while the table itself can scroll when there are many columns. |
| Authoring formats | `.md`, `.mdx`, and `.svx` share the same Markdown pipeline and can opt into Svelte components where needed. | This row is intentionally verbose so the default theme demonstrates comfortable vertical reading space in dense reference tables. |

## Math

Inline math like $a^2 + b^2 = c^2$ and block math are passed through the Markdown pipeline.

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

## Code metadata

```ts title="svedocs.config.ts" {1} focus=3
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: { name: 'svedocs' }
});
```

Code blocks include syntax highlighting, metadata, line highlighting, focus hints, diff markers, and a copy action in the default theme.
