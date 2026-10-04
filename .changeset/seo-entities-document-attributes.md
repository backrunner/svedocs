---
"svedocs": patch
"svedocs-cli": patch
---

Unify page URL normalization and JSON-LD entity references, add replaceable SEO rendering, and set document language and direction during SSR and prerendering in generated templates. Emit article Open Graph tags only for articles, support author profile URLs via `defaultAuthorUrl`/`authorUrl` and prevent duplicate theme initialization in nested custom layouts. Generated templates also pin Wrangler to the version validated by the repository to keep the Cloudflare adapter runtime compatible.
