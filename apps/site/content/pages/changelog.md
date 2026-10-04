---
title: Changelog
description: Product updates rendered with the default svedocs single-page template.
published: 2026-05-18
updatedTime: 2026-10-05
type: website
---

# Changelog

This page uses the built-in single-page layout. It omits the docs sidebar while keeping the site's metadata, search records, OG route, theme controls, and command palette.

## Unreleased

- Add frame ownership props, not-prose isolation and Tailwind overrides to prevent duplicate frames in custom themes.
- Correct article sharing tags and author profile URLs; avoid duplicate theme initialization in custom layouts.
- Share stable WebSite/Organization IDs, merge custom JSON-LD and unify page/discovery URL rules.
- Set document language and direction during SSR/prerendering and add an independent `Seo` rendering extension.
- Update English/Chinese setup, configuration, localization and API docs; audit site-wide content and SEO without JavaScript.
- Pin generated templates to the repository-validated Wrangler version.

**Integration notes:** Existing projects should compose `createSvedocsHtmlHandle` into server hooks. Register complete SEO replacements through the Vite plugin’s `theme.components.Seo`. Generated templates already include this wiring.

## 0.2.2 — 2026-09-22

- Add a localized search close button on desktop and mobile, and fix dismissal by clicking or tapping outside the dialog.
- Preserve native modal behavior, restore focus consistently in Safari, and keep underlying dialogs open when dismissing search.
- Document custom search UI replacement and the mobile search event contract.
- Add optional Umami, GA4, Google Ads, and AdSense integrations, generated IndexNow verification and ads.txt files, and the `svedocs indexnow` command.

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
