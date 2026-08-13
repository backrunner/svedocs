---
"svedocs": patch
---

Fix heading id mismatches between rendered HTML and the outline/search extraction. Inline code spans containing angle brackets (for example `### \`init <path>\``) and headings with adjacent inline formatting previously produced TOC and search-section links pointing at nonexistent anchors, which could fail prerender builds; the markdown-side text extraction now mirrors the rehype side exactly.

Sidebar sections whose index page sets an explicit `order` now sort by that order. The min-of-children weight propagation only applies to sections without an index order, so a section can be positioned without coordinating disjoint `order` ranges across every section.
