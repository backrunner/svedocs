# svedocs

## 0.2.1

### Patch Changes

- d3f87a0: Unify robots filtering across metadata and discovery, revalidate stable OG images, and use PNG sharing images by default. Generate localized breadcrumb structured data, support independent SEO titles, author types and explicit Open Graph locales, and include image metadata. Use explicit editorial dates instead of filesystem timestamps in SEO output and deduplicate sitemap canonical URLs.

  PNG assets must be generated during a Node build or prerender; use explicit SVG format for dynamic edge rendering. Modification dates now require editorial `updatedTime` rather than filesystem timestamps. Configure `ogLocale` when a language-only locale needs an Open Graph territory. Existing imports, page fields, and synchronous search APIs remain available.

- 285b4b0: Add an opt-in bounded per-isolate HTML cache for public SSR pages, preserving agent negotiation and conditional requests. Pin server virtual configuration to the effective build mode so CLI static/SPA overrides also reach runtime integrations.
- 285b4b0: Defer search data and MiniSearch until needed, run default-theme local search in a shared Worker with a cooperative fallback, and reuse Markdown analysis and unchanged content during Vite refreshes. Preserve synchronous headless search APIs and keep generated template error pages lazy.
- 498e180: Keep localized sidebars at the same depth and preserve custom navigation through a shared theme context. Support IME input in search and Ask AI, native modal behavior, and mobile search and page outlines. Add a plain reading style and virtual-module type declarations while preserving the existing theme CSS entry point.

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
