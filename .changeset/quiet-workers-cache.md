---
"svedocs": patch
---

Add opt-in, deployment-versioned Cloudflare HTML caching across Worker isolates. Avoid repeated route scans in HTML and agent hooks, reuse cached markdown ETags without decoding bodies, and keep SvelteKit data requests out of HTML caching and agent negotiation.
