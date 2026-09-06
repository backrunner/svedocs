---
title: Search and Ask AI
description: Use local search, Cloudflare AI Search, Ask AI providers, citations, streaming responses, and rate limits.
order: 2
---

# Search and Ask AI

svedocs creates search records for each page and section. Local MiniSearch, Algolia, Typesense, Cloudflare indexing, and Ask AI citations can all work from those records.

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

Generated templates use this runtime route. It reads `svedocs.config.ts` and selects `local`, `algolia`, `typesense`, or `cloudflare-ai-search`. If credentials or bindings are missing, the route uses local MiniSearch instead.

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

`createConfiguredAskResponse` selects `mock`, `cloudflare-ai-search`, `cloudflare-workers-ai`, or `openai-compatible` from the config. During development, missing credentials produce a mock answer with local citations instead of an error.

## Local search

Local search requires no external service. MiniSearch ranks matches from titles, sections, paths, body content, and metadata. Use the `locale` and `kind` query parameters to limit the results.

```txt
/api/search?q=cloudflare&locale=zh
```

## Algolia

Set `search.provider = 'algolia'` and provide `ALGOLIA_APP_ID`, `ALGOLIA_SEARCH_KEY`, and `ALGOLIA_INDEX_NAME` in the server runtime environment. Algolia is optional and server-routed, so search keys do not need to be embedded in the default theme. Use it when an existing DocSearch crawler or hosted search pipeline already owns your index.

## Typesense

Set `search.provider = 'typesense'` and provide `TYPESENSE_HOST`, `TYPESENSE_SEARCH_KEY`, and optionally `TYPESENSE_COLLECTION`. Typesense suits teams that want a self-hosted search service with fast typo tolerance. svedocs calls it over REST, so the generated site does not gain another runtime package.

## Cloudflare AI Search

This integration supports the current `ai_search` and `ai_search_namespaces` bindings. It is opt-in; new sites use local MiniSearch.

## Indexing

```sh
svedocs index --provider cloudflare-ai-search --dry-run
svedocs index --provider cloudflare-ai-search --strategy replace --wait
```

The index command uploads Markdown documents, can delete stale records explicitly, and reports failures per record. Display data is stored in a compact `svedocs` JSON field, while `locale` and `kind` remain available for filtering.

## Ask AI

The Ask AI route supports JSON and event-stream responses. Cloudflare AI Search can pass through its token stream when the binding supports `chatCompletions({ stream: true })`; other providers return structured answer and citation events. Requests may include `locale` or `kind`, and the default theme sends the active filters automatically.

## OpenAI-compatible Ask AI

Set `ai.provider = 'openai-compatible'` and provide `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_MODEL`, and optionally `OPENAI_COMPATIBLE_BASE_URL`. svedocs builds a short RAG prompt from local search records and sends it to any compatible Chat Completions service, including OpenAI, OpenRouter, Groq, Together, or a private gateway.

When you need lower-level control, import `createAlgoliaSearchProvider`, `createTypesenseSearchProvider`, `createCloudflareAiSearchProvider`, `createWorkersAiProvider`, or `createOpenAiCompatibleProvider` directly and pass the resulting provider to `createSearchResponse` or `createAskResponse`.

## Rate limits

```ts
import { createCloudflareKvRateLimiter } from 'svedocs/ai';

const rateLimiter = createCloudflareKvRateLimiter({
  namespace: platform.env.SVEDOCS_RATE_LIMIT,
  windowMs: 60_000,
  max: 30
});
```

Use the memory limiter for local development and KV-backed limiting for edge deployments.

## Long conversations and retrieval context

The default Ask AI panel keeps the visible conversation while sending only recent history within the server’s message, text, and UTF-8 byte budgets. It sends the current question separately to avoid duplication. Workers AI receives retrieved source passages and links within the active locale and content scope.

The KV rate limiter stores entries for at least 60 seconds to meet Cloudflare KV requirements. The logical window still uses the configured `resetAt`, so a 10-second window remains 10 seconds. KV is eventually consistent and provides approximate limiting; strict concurrent quotas require storage with atomic operations.
