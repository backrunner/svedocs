# create-svedocs

## 0.3.0

### Minor Changes

- 90ed837: Upgrade runtime and build dependencies to SvelteKit 3, Svelte 5.57, Vite 8.3, Cloudflare adapter 8, Wrangler 4.150, Vitest 5 and current stable rendering dependencies. Keep TypeScript at 6.0.3 and require Node.js 22.17 or newer.

  Migrate generated apps to Vite-based SvelteKit configuration, native #lib imports and current environment/state APIs. Preserve Cloudflare bindings and background cache writes across edge, static and SPA builds.

  Reduce repeated route normalization during SSR and remove redundant HTML response buffer copies while preserving independent response bodies.

### Patch Changes

- Updated dependencies [90ed837]
  - svedocs-cli@0.3.0

## 0.2.4

### Patch Changes

- svedocs-cli@0.2.4

## 0.2.3

### Patch Changes

- Updated dependencies [d855587]
  - svedocs-cli@0.2.3

## 0.2.2

### Patch Changes

- Updated dependencies [1e39e9d]
  - svedocs-cli@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [285b4b0]
  - svedocs-cli@0.2.1

## 0.2.0

### Patch Changes

- 163eb19: Add an agent interface: per-page markdown twins at `<route>/index.md`, `/llms.txt` and `/llms-full.txt`, edge-only agent user-agent/Accept negotiation with Cloudflare Cache API caching (content-versioned keys, private outgoing responses), and a config-aware `svedocsPagePrerender` that keeps pages server-rendered when negotiation is enabled.
- Updated dependencies [163eb19]
- Updated dependencies [d20a968]
  - svedocs-cli@0.2.0

## 0.2.0-beta.3

### Patch Changes

- svedocs-cli@0.2.0-beta.3

## 0.1.1-beta.2

### Patch Changes

- svedocs-cli@0.1.1-beta.2

## 0.1.1-beta.1

### Patch Changes

- 163eb19: Add an agent interface: per-page markdown twins at `<route>/index.md`, `/llms.txt` and `/llms-full.txt`, edge-only agent user-agent/Accept negotiation with Cloudflare Cache API caching (content-versioned keys, private outgoing responses), and a config-aware `svedocsPagePrerender` that keeps pages server-rendered when negotiation is enabled.
- Updated dependencies [163eb19]
  - svedocs-cli@0.1.1-beta.1
