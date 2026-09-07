# svedocs-cli

## 0.2.1

### Patch Changes

- 285b4b0: Defer search data and MiniSearch until needed, run default-theme local search in a shared Worker with a cooperative fallback, and reuse Markdown analysis and unchanged content during Vite refreshes. Preserve synchronous headless search APIs and keep generated template error pages lazy.
- Updated dependencies [d3f87a0]
- Updated dependencies [285b4b0]
- Updated dependencies [285b4b0]
- Updated dependencies [498e180]
  - svedocs@0.2.1

## 0.2.0

### Patch Changes

- 163eb19: Add an agent interface: per-page markdown twins at `<route>/index.md`, `/llms.txt` and `/llms-full.txt`, edge-only agent user-agent/Accept negotiation with Cloudflare Cache API caching (content-versioned keys, private outgoing responses), and a config-aware `svedocsPagePrerender` that keeps pages server-rendered when negotiation is enabled.
- d20a968: Add lazy content and layout loaders, route-specific Svelte page components, and a reactive theme context for custom components. Generated routes load only the selected page and layout. Cache ToC positions and reuse the initial content manifest during Vite startup.

  Fix KV rate-limit expiration, fenced-code title handling, title-only markdown twins, agent metadata cache invalidation, Workers AI source context, and long Ask AI conversations. Generate OG assets before Vite copies static files. Include Svelte component checking in package and generated-project validation.

- Updated dependencies [163eb19]
- Updated dependencies [d20a968]
- Updated dependencies [f6de35c]
- Updated dependencies [86b5fb8]
- Updated dependencies [9bac46e]
  - svedocs@0.2.0

## 0.2.0-beta.3

### Patch Changes

- Updated dependencies [f6de35c]
- Updated dependencies [86b5fb8]
- Updated dependencies
  - svedocs@0.2.0-beta.3

## 0.1.1-beta.2

### Patch Changes

- Updated dependencies [9bac46e]
  - svedocs@0.1.1-beta.2

## 0.1.1-beta.1

### Patch Changes

- 163eb19: Add an agent interface: per-page markdown twins at `<route>/index.md`, `/llms.txt` and `/llms-full.txt`, edge-only agent user-agent/Accept negotiation with Cloudflare Cache API caching (content-versioned keys, private outgoing responses), and a config-aware `svedocsPagePrerender` that keeps pages server-rendered when negotiation is enabled.
- Updated dependencies [163eb19]
  - svedocs@0.1.1-beta.1
