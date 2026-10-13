---
"svedocs": minor
"svedocs-cli": minor
"create-svedocs": minor
---

Upgrade runtime and build dependencies to SvelteKit 3, Svelte 5.57, Vite 8.3, Cloudflare adapter 8, Wrangler 4.150, Vitest 5 and current stable rendering dependencies. Keep TypeScript at 6.0.3 and require Node.js 22.17 or newer.

Migrate generated apps to Vite-based SvelteKit configuration, native #lib imports and current environment/state APIs. Preserve Cloudflare bindings and background cache writes across edge, static and SPA builds.

Reduce repeated route normalization during SSR and remove redundant HTML response buffer copies while preserving independent response bodies.
