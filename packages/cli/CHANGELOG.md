# svedocs-cli

## 0.1.1-beta.0

### Patch Changes

- 163eb19: Add an agent interface: per-page markdown twins at `<route>/index.md`, `/llms.txt` and `/llms-full.txt`, edge-only agent user-agent/Accept negotiation with Cloudflare Cache API caching (content-versioned keys, private outgoing responses), and a config-aware `svedocsPagePrerender` that keeps pages server-rendered when negotiation is enabled.
- Updated dependencies [163eb19]
  - svedocs@0.1.1-beta.0
