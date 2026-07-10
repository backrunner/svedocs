---
title: Writing
description: Plan, structure, and author documentation with Markdown, frontmatter, and Svelte-powered examples.
order: 3
---

# Writing

In svedocs, the file tree is also the structure of the site. File names and frontmatter determine routes, sidebar order, page outlines, search results, SEO data, and Ask AI citations.

This section covers how to organize that content and write pages that are easy to read and easy to find.

## Where files go

Most projects use two content roots:

| Root | Purpose | Route shape |
| --- | --- | --- |
| `content/docs` | Product docs, guides, tutorials, API explanations, integration notes. | `/docs/...` |
| `content/pages` | Landing pages, changelog pages, standalone product pages. | `/...` |

Put guides and reference material in `docs` when they belong in the sidebar. Use `pages` for home pages, changelogs, and other standalone content.

## File formats

| Format | Use it for |
| --- | --- |
| `.md` | Most documentation: prose, tables, code blocks, callouts, math, and images. |
| `.svx` | Pages that need Svelte components, interactive examples, or richer local composition. |
| `.mdx` | MDX-style authoring when you prefer that extension; svedocs still compiles it through the Svelte-compatible pipeline. |

Start with Markdown. Move to SVX only when the page needs interactivity.

## Recommended page shape

A useful docs page usually has:

1. A specific `title` and `description`.
2. A short opening paragraph that explains who the page is for.
3. A working example near the top.
4. Sections that map to user tasks, not internal implementation details.
5. A troubleshooting or next-steps section when the workflow can fail.

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

## Navigation and ordering

The sidebar is generated from the file tree and frontmatter:

- `order` moves pages and groups above alphabetical sorting.
- `navTitle` shortens the sidebar label without changing the page title.
- `collapsed` controls whether a group starts collapsed.
- `hidden` removes a page from navigation and generated public lists.
- `icon` passes an icon hint to the default theme.

Directory index pages are important. A file like `content/docs/configuration/index.md` represents the group landing page for `/docs/configuration`.

## Search and Ask AI quality

Search records are created from pages and headings. Ask AI citations also use these records, so clear headings directly improve retrieval quality.

Prefer:

- Task-focused headings: `Configure Algolia`, `Deploy to Cloudflare Pages`.
- Specific descriptions: one sentence that says what the page helps users accomplish.
- Short examples with real file names.
- Stable anchor names for pages that other docs link to.

Avoid:

- Many pages with the same title.
- Generic headings like `Usage`, `Options`, or `More`.
- Long code blocks without explanation.
- Hiding pages that should still be discoverable in search.

## Section guide

- [Content](/docs/writing/content): frontmatter, Markdown features, code blocks, diffs, links, assets, and section extraction.
- [Components](/docs/writing/components): Svelte components, custom layouts, and theme composition.

## Documentation workflow

Use this loop while writing:

```sh
pnpm dev
pnpm check
pnpm build
```

Run `pnpm check` regularly. It catches broken links, route conflicts, and missing metadata before they become harder to spot in a large site.
