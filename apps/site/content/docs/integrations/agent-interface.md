---
title: Agent interface
description: Serve markdown twins, llms.txt, and llms-full.txt, and route AI agent requests to markdown automatically on SSR deployments.
order: 5
---

# Agent interface

svedocs can expose an agent-readable surface next to the HTML site, so coding agents and AI crawlers consume your docs as cleanly as browsers do. The surface has three parts:

- **Markdown twins** — every page is also available at `<route>/index.md` (the root page at `/index.md`) as `text/markdown`, with frontmatter, a pointer to the documentation index, and a `Source:` footer.
- **`/llms.txt`** — an index of all pages with their twin links and descriptions.
- **`/llms-full.txt`** — the full corpus in a single document.
- **Agent negotiation** — on edge (SSR) deployments, requests from known AI agent user agents, or requests that prefer `Accept: text/markdown`, receive the markdown twin instead of HTML.

## Configuration

The agent interface is enabled by default. Tune or disable it with the `agent` section:

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  agent: {
    enabled: true,
    markdown: true, // per-page markdown twins
    llms: true, // /llms.txt and /llms-full.txt
    negotiation: {
      enabled: true, // SSR only
      userAgents: ['ClaudeBot', 'GPTBot'], // replaces the built-in list
      accept: true // honor Accept: text/markdown
    }
  }
});
```

Use `agent: false` to turn the whole interface off, or `negotiation: false` to keep the static surfaces but never rewrite requests. The `llms` index depends on the markdown twins; with `markdown: false` the index files are disabled as well.

## Routes

Generated projects wire these endpoints; older projects can add them by hand:

```ts title="src/routes/llms.txt/+server.ts"
import { createLlmsTxtResponse } from 'svedocs/agent';
import config from 'virtual:svedocs/config';
import markdown from 'virtual:svedocs/markdown';
import pages from 'virtual:svedocs/page-index';
import type { RequestHandler } from './$types';

export const prerender = config.agent.enabled && config.agent.llms && config.agent.markdown;

export const GET: RequestHandler = ({ request }) => createLlmsTxtResponse(config, pages, markdown, request);
```

The same pattern covers `/llms-full.txt` (`createLlmsFullTxtResponse`), the page twins (`createPageMarkdownResponse` under `src/routes/[...path]/index.md/+server.ts` plus `src/routes/index.md/+server.ts`), all exported from `svedocs/agent`. The raw markdown for every page ships in the `virtual:svedocs/markdown` module as a map from page id to markdown source.

Pages marked `hidden: true` or `robots: noindex` are excluded from twins, `llms.txt`, and `llms-full.txt`. On localized sites the index files list default-locale pages only.

## Agent negotiation (SSR)

On edge deployments, add a server hook to route agent traffic to markdown at the canonical URL:

```ts title="src/hooks.server.ts"
import { createSvedocsAgentHandle } from 'svedocs/agent';
import config from 'virtual:svedocs/config';
import markdown from 'virtual:svedocs/markdown';
import pages from 'virtual:svedocs/page-index';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = createSvedocsAgentHandle({ config, pages, markdown });
```

A request is treated as an agent request when its `User-Agent` contains one of the configured agent tokens (ClaudeBot, GPTBot, PerplexityBot, and similar by default), or when its `Accept` header prefers `text/markdown` over `text/html`. Matching requests receive the markdown twin with `Vary: accept, user-agent`; everything else resolves normally. Pass-through HTML responses on negotiable paths carry the same `Vary` headers, so shared caches never serve one variant to the other audience.

Negotiation only runs when `build.mode` is `'edge'` — static and SPA builds have no server, so agents discover the twins through `llms.txt` and the `/index.md` URL convention instead. In static and SPA builds the twin and index endpoints are prerendered as plain files.

Prerendered pages are served as static assets before the Worker, so a prerendered page can never be negotiated. That is why `svedocsPagePrerender()` automatically returns `false` (server-render pages) in edge mode whenever negotiation is enabled — if you set `prerender = true` on pages yourself, negotiation will not apply to them.

## Edge caching

On Cloudflare, negotiated markdown responses are stored in the [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) (`caches.default`) automatically:

- **Cache keys are content-versioned** — a hash of the markdown corpus is embedded in every key, so a deploy that changes content negotiates into fresh keys immediately. No manual purging is needed; stale entries simply expire.
- **TTL** comes from `negotiation.cache.maxAge` (default `3600` seconds) and lives only on the stored cache entry.
- **No cache poisoning** — the markdown response sent to the client is `private, max-age=0, must-revalidate` (with an ETag for revalidation), because Cloudflare's edge cache ignores `Vary: accept, user-agent` and would otherwise serve markdown to browsers under the page URL. Only the dedicated Cache API entry, keyed separately, carries the shared TTL.
- Only negotiated markdown responses (status 200, `GET`) are cached. HTML pass-through responses are never stored by the hook, and browsers never read the agent cache entries.
- Cache writes use `waitUntil` when the platform provides it, so they never delay the response.

Disable caching with `negotiation: { cache: false }`, or tune it with `negotiation: { cache: { maxAge: 86400 } }`. Outside Cloudflare (no `caches.default`), the hook skips caching transparently and still negotiates.
