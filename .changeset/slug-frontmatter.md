---
"svedocs": patch
---

Support the `slug` frontmatter field to replace the final segment of a page route (for example `content/docs/guides/deploy.md` with `slug: ship-to-production` serves at `/docs/guides/ship-to-production`). Scope pairing stays file-based, so translations pair by file path and each locale may use its own slug. Slugs that are not a single URL path segment, or use reserved values like `index`, `.`, or `..`, are ignored and reported as an `invalid-slug` content check warning.
