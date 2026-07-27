# svedocs

## 0.1.1-beta.2

### Patch Changes

- 9bac46e: Support the `slug` frontmatter field to replace the final segment of a page route (for example `content/docs/guides/deploy.md` with `slug: ship-to-production` serves at `/docs/guides/ship-to-production`). Scope pairing stays file-based, so translations pair by file path and each locale may use its own slug. Slugs that are not a single URL path segment, or use reserved values like `index`, `.`, or `..`, are ignored and reported as an `invalid-slug` content check warning.

## 0.1.1-beta.1

### Patch Changes

- 163eb19: Add an agent interface: per-page markdown twins at `<route>/index.md`, `/llms.txt` and `/llms-full.txt`, edge-only agent user-agent/Accept negotiation with Cloudflare Cache API caching (content-versioned keys, private outgoing responses), and a config-aware `svedocsPagePrerender` that keeps pages server-rendered when negotiation is enabled.
