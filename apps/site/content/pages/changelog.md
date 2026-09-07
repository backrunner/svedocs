---
title: Changelog
description: Product updates rendered with the default svedocs single-page template.
published: 2026-05-18
updatedTime: 2026-09-07
type: website
---

# Changelog

This page uses the built-in single-page layout. It omits the docs sidebar while keeping the site's metadata, search records, OG route, theme controls, and command palette.

## 0.2.1 — 2026-09-07

- Load local search only when needed and move default-theme ranking into a shared Worker.
- Reuse Markdown analysis and unchanged page compilation during development; add an opt-in bounded public SSR HTML cache.
- Fix localized navigation, IME input, and mobile search/dialog behavior.
- Align noindex, hreflang, sitemap, RSS, and agent discovery; add breadcrumb structured data and richer sharing metadata.
- Generate PNG sharing images by default, wrap long titles, and revalidate stable image URLs.

**Upgrade notes:** PNG rendering runs during a Node build or prerender. Choose SVG explicitly for dynamic edge image routes. Modification metadata and the visible update label now require editorial `updatedTime`; filesystem timestamps are no longer presented as content dates. Existing public imports, page fields, and synchronous search APIs remain available.

## 2026-05-18

- Expanded theme configuration for navigation, fonts, radius, and code themes.
- Added compile-time Markdown plugin hooks for remark and rehype.
- Extended SEO metadata with author and publish/update timestamps.
