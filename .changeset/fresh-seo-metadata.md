---
"svedocs": patch
---

Unify robots filtering across metadata and discovery, revalidate stable OG images, and use PNG sharing images by default. Generate localized breadcrumb structured data, support independent SEO titles, author types and explicit Open Graph locales, and include image metadata. Use explicit editorial dates instead of filesystem timestamps in SEO output and deduplicate sitemap canonical URLs.

PNG assets must be generated during a Node build or prerender; use explicit SVG format for dynamic edge rendering. Modification dates now require editorial `updatedTime` rather than filesystem timestamps. Configure `ogLocale` when a language-only locale needs an Open Graph territory. Existing imports, page fields, and synchronous search APIs remain available.
