---
title: Content
description: Author pages with frontmatter, GFM, KaTeX, code blocks, diffs, links, assets, and section extraction.
order: 2
---

# Content

svedocs scans `.md`, `.mdx`, and `.svx` files from the configured content roots and turns them into a typed page manifest. That manifest drives routes, navigation, search records, checks, SEO, and the default theme.

## Route mapping

The default content roots are:

```txt
content/docs -> /docs
content/pages -> /
```

Examples:

| File | Route |
| --- | --- |
| `content/docs/index.md` | `/docs` |
| `content/docs/writing/content.md` | `/docs/writing/content` |
| `content/docs/configuration/index.md` | `/docs/configuration` |
| `content/pages/changelog.md` | `/changelog` |

Use `index.md` for a section landing page. Use nested directories when the sidebar should have groups.

## Frontmatter

Every important page should include at least `title` and `description`:

```md
---
title: Content
description: Explain the content pipeline and authoring features.
order: 2
---
```

Common fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `title` | string | Page title, search title, OG title, and default sidebar title. |
| `navTitle` | string | Shorter sidebar label without changing the document title. |
| `description` | string | SEO description, search excerpt fallback, and page summary. |
| `order` | number | Sort weight in navigation and previous/next links. |
| `hidden` | boolean | Remove from generated navigation and public lists. |
| `collapsed` | boolean | Collapse a navigation group by default. |
| `section` | boolean | Mark a directory page as a section page. |
| `icon` | string | Icon hint for the default theme. |
| `canonical` | string | Override the generated canonical URL. |
| `image` | string | Open Graph image URL. |
| `keywords` | string[] | SEO and search metadata. |
| `author` | string | Article author; falls back to `seo.defaultAuthor`. |
| `published`, `date`, `publishedTime` | date | Publication time. |
| `updated`, `updatedTime` | date | Last meaningful content update. |
| `type`, `ogType` | string | Open Graph content type. |

If the first Markdown heading matches `title`, svedocs removes the duplicate heading from rendered content while preserving the page title.

## Markdown features

svedocs supports GitHub-flavored Markdown features such as tables, task lists, and autolinks. It also extracts headings for anchors and page table-of-contents data.

```md
## Configure search

- [x] Create the runtime route.
- [x] Choose a provider.
- [ ] Add production credentials.
```

KaTeX is available for inline and block math when your content needs formulas.

## Code blocks

Use code metadata to make examples easier to scan:

````md
```ts title="svedocs.config.ts" {1} focus=3
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: { name: 'svedocs' }
});
```
````

The default theme supports:

- Syntax highlighting.
- File titles with `title="..."` or `filename="..."`.
- Line highlighting with `{1,3-5}`.
- Focus hints with `focus=3`.
- Optional line numbers and wrapping from theme config.
- Copy actions.

## Diff blocks

Use standard diff fences for small changes:

```diff
- const docs = fragmented();
+ const docs = svedocs();
```

Use split diffs when the before/after relationship matters:

```diff split title="packages/svedocs/src/core.ts"
@@ -1,3 +1,4 @@
-export * from './content.js';
+export * from './core/content.js';
+export * from './core/navigation.js';
 export * from './config.js';
```

Split diffs support horizontal scrolling on both panes, so long code stays inspectable on narrow screens.

## Links and assets

Internal links are checked against generated routes and extracted heading anchors:

```md
Read [Configuration](/docs/configuration) and jump to
[Build modes](/docs/configuration#build-modes).
```

External links receive a small inline icon in the default theme so readers can distinguish off-site navigation:

```md
Read the [SvelteKit docs](https://svelte.dev/docs/kit).
```

For example, the [SvelteKit documentation](https://svelte.dev/docs/kit) link is marked as an external web link.

Use a standalone internal link with a `card` title to render a Fumadocs-style link card:

```md
[SEO and OG](/docs/integrations/seo-og "card: Metadata, sitemap, robots, JSON-LD, and Open Graph routes.")
```

Local assets are checked when `checks.assets` is enabled:

```md
![Dashboard screenshot](/images/dashboard.png)
```

Use absolute site paths for public assets and stable docs routes for internal links. That keeps search, Ask AI citations, and static builds aligned.

## Search records

svedocs creates two kinds of search records:

| Record | Created from | Useful for |
| --- | --- | --- |
| Page records | The page title, description, route, and content. | Broad queries that should land on the page. |
| Section records | Headings and nearby content. | Specific queries that should jump into a long guide. |

Clear headings improve search quality more than keyword stuffing. Prefer headings that describe a user task or concept.

## Authoring checklist

Before publishing a page:

- Does the page have a unique `title` and useful `description`?
- Does the route belong in `docs` or should it be a standalone `page`?
- Are headings specific enough to become search targets?
- Do code examples include file names when context matters?
- Do internal links point to real routes and anchors?
- Does the page need `canonical`, `image`, `published`, or `updated` metadata?
