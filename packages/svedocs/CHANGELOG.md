# svedocs

## 0.2.0

### Minor Changes

- d20a968: Add lazy content and layout loaders, route-specific Svelte page components, and a reactive theme context for custom components. Generated routes load only the selected page and layout. Cache ToC positions and reuse the initial content manifest during Vite startup.

  Fix KV rate-limit expiration, fenced-code title handling, title-only markdown twins, agent metadata cache invalidation, Workers AI source context, and long Ask AI conversations. Generate OG assets before Vite copies static files. Include Svelte component checking in package and generated-project validation.

### Patch Changes

- 163eb19: Add an agent interface: per-page markdown twins at `<route>/index.md`, `/llms.txt` and `/llms-full.txt`, edge-only agent user-agent/Accept negotiation with Cloudflare Cache API caching (content-versioned keys, private outgoing responses), and a config-aware `svedocsPagePrerender` that keeps pages server-rendered when negotiation is enabled.
- f6de35c: Fix heading id mismatches between rendered HTML and the outline/search extraction. Inline code spans containing angle brackets (for example `### \`init <path>\``) and headings with adjacent inline formatting previously produced TOC and search-section links pointing at nonexistent anchors, which could fail prerender builds; the markdown-side text extraction now mirrors the rehype side exactly.

  Sidebar sections whose index page sets an explicit `order` now sort by that order. The min-of-children weight propagation only applies to sections without an index order, so a section can be positioned without coordinating disjoint `order` ranges across every section.

- 86b5fb8: Optimize local raster images to their display width by default, with configurable format, quality, and output directory. Remote images remain unchanged, and individual images or whole pages can opt out of optimization.
- 9bac46e: Support the `slug` frontmatter field to replace the final segment of a page route (for example `content/docs/guides/deploy.md` with `slug: ship-to-production` serves at `/docs/guides/ship-to-production`). Scope pairing stays file-based, so translations pair by file path and each locale may use its own slug. Slugs that are not a single URL path segment, or use reserved values like `index`, `.`, or `..`, are ignored and reported as an `invalid-slug` content check warning.

## 0.2.0-beta.3

### Minor Changes

- Add the `SvedocsImage` theme component for build-time optimization of static local images in custom Svelte layouts and landing pages.

### Patch Changes

- f6de35c: Fix heading id mismatches between rendered HTML and the outline/search extraction. Inline code spans containing angle brackets (for example `### \`init <path>\``) and headings with adjacent inline formatting previously produced TOC and search-section links pointing at nonexistent anchors, which could fail prerender builds; the markdown-side text extraction now mirrors the rehype side exactly.

  Sidebar sections whose index page sets an explicit `order` now sort by that order. The min-of-children weight propagation only applies to sections without an index order, so a section can be positioned without coordinating disjoint `order` ranges across every section.

- 86b5fb8: Optimize local raster images to their display width by default, with configurable format, quality, and output directory. Remote images remain unchanged, and individual images or whole pages can opt out of optimization.

## 0.1.1-beta.2

### Patch Changes

- 9bac46e: Support the `slug` frontmatter field to replace the final segment of a page route (for example `content/docs/guides/deploy.md` with `slug: ship-to-production` serves at `/docs/guides/ship-to-production`). Scope pairing stays file-based, so translations pair by file path and each locale may use its own slug. Slugs that are not a single URL path segment, or use reserved values like `index`, `.`, or `..`, are ignored and reported as an `invalid-slug` content check warning.

## 0.1.1-beta.1

### Patch Changes

- 163eb19: Add an agent interface: per-page markdown twins at `<route>/index.md`, `/llms.txt` and `/llms-full.txt`, edge-only agent user-agent/Accept negotiation with Cloudflare Cache API caching (content-versioned keys, private outgoing responses), and a config-aware `svedocsPagePrerender` that keeps pages server-rendered when negotiation is enabled.
