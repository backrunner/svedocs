---
title: Search and Ask AI
description: Use local search, Cloudflare AI Search, Ask AI providers, citations, streaming responses, and rate limits.
order: 8
---

# Search and Ask AI

svedocs builds search records from pages and sections. Those records power MiniSearch-backed local search, optional Algolia or Typesense search, Cloudflare indexing, and local fallback citations for Ask AI.

## Runtime routes

```ts title="src/routes/api/search/+server.ts"
import { createConfiguredSearchResponse } from 'svedocs/search';
import config from 'virtual:svedocs/config';
import records from 'virtual:svedocs/search';

export const GET = ({ platform, request }) => {
  return createConfiguredSearchResponse(config, records, request, {
    env: platform?.env ?? process.env
  });
};
```

The generated templates use the configured runtime route. It selects `local`, `algolia`, `typesense`, or `cloudflare-ai-search` from `svedocs.config.ts`, then falls back to local MiniSearch when hosted credentials or bindings are missing.

```ts title="src/routes/api/ask/+server.ts"
import { createConfiguredAskResponse, createMemoryRateLimiter } from 'svedocs/ai';
import config from 'virtual:svedocs/config';
import records from 'virtual:svedocs/search';

const rateLimiter = createMemoryRateLimiter({ windowMs: 60_000, max: 30 });

export const POST = ({ platform, request }) => {
  return createConfiguredAskResponse(config, records, request, {
    env: platform?.env ?? process.env,
    rateLimiter
  });
};
```

`createConfiguredAskResponse` selects `mock`, `cloudflare-ai-search`, `cloudflare-workers-ai`, or `openai-compatible` from config. Missing credentials fall back to the mock provider with local citations instead of throwing during development.

## Local Search

Local search is deterministic and requires no hosted service. It uses MiniSearch to rank title, section, path, content, and metadata matches, and it accepts `locale`, `version`, and `kind` query parameters for scoped sites.

```txt
/api/search?q=cloudflare&locale=zh&version=v1
```

## Algolia

Set `search.provider = 'algolia'` and provide `ALGOLIA_APP_ID`, `ALGOLIA_SEARCH_KEY`, and `ALGOLIA_INDEX_NAME` in the server runtime environment. Algolia is optional and server-routed, so search keys do not need to be embedded in the default theme. Use it when an existing DocSearch crawler or hosted search pipeline already owns your index.

## Typesense

Set `search.provider = 'typesense'` and provide `TYPESENSE_HOST`, `TYPESENSE_SEARCH_KEY`, and optionally `TYPESENSE_COLLECTION`. Typesense is useful when you want a self-hostable search service with fast typo tolerance. The provider is REST-based and does not add a runtime dependency to the generated site.

## Cloudflare AI Search

The provider supports the current `ai_search` and `ai_search_namespaces` bindings and keeps legacy `autorag()` compatibility only as a fallback for older Workers setups. It is not enabled by default; local MiniSearch remains the default search provider.

## Indexing

```sh
svedocs index --provider cloudflare-ai-search --dry-run
svedocs index --provider cloudflare-ai-search --strategy replace --wait
```

Indexing uploads Markdown documents with compact svedocs metadata, supports explicit deletes, and reports per-record failures. The compact metadata uses one `svedocs` JSON field for display data and preserves `locale`, `version`, and `kind` as filterable fields.

## Ask AI

The Ask AI runtime route supports JSON and event-stream responses. Cloudflare AI Search can pass through native token streams when the binding supports `chatCompletions({ stream: true })`; other providers still return structured answer/citation events. Request bodies can include `locale`, `version`, or `kind`; the default theme sends the active scope automatically.

## OpenAI-Compatible Ask AI

Set `ai.provider = 'openai-compatible'` and provide `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_MODEL`, and optionally `OPENAI_COMPATIBLE_BASE_URL`. This provider builds a small RAG prompt from local svedocs search records, so it can work with OpenAI-compatible Chat Completions providers such as OpenAI, OpenRouter, Groq, Together, or private gateways.

When you need lower-level control, import `createAlgoliaSearchProvider`, `createTypesenseSearchProvider`, `createCloudflareAiSearchProvider`, `createWorkersAiProvider`, or `createOpenAiCompatibleProvider` directly and pass the resulting provider to `createSearchResponse` or `createAskResponse`.

## Rate Limits

```ts
import { createCloudflareKvRateLimiter } from 'svedocs/ai';

const rateLimiter = createCloudflareKvRateLimiter({
  namespace: platform.env.SVEDOCS_RATE_LIMIT,
  windowMs: 60_000,
  max: 30
});
```

Use the memory limiter for local development and KV-backed limiting for edge deployments.
