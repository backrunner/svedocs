---
title: 搜索和 Ask AI
description: 使用本地搜索、Cloudflare AI Search、Ask AI 提供商、引用、流式响应和限流。
order: 2
---

# 搜索和 Ask AI

svedocs 会从页面和小节生成 search record，这些记录会被本地 MiniSearch、可选的 Algolia 或 Typesense、Cloudflare 索引，以及 Ask AI 的本地引用所复用。

## 运行时路由

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

生成模板默认使用这条运行时路由。它会根据 `svedocs.config.ts` 选择 `local`、`algolia`、`typesense` 或 `cloudflare-ai-search`，如果宿主凭据缺失，就回退到本地 MiniSearch。

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

`createConfiguredAskResponse` 会根据配置选择 `mock`、`cloudflare-ai-search`、`cloudflare-workers-ai` 或 `openai-compatible`。开发环境里如果缺少凭据，它会落到 mock provider 和本地引用，而不是直接报错。

## 本地搜索

本地搜索是确定性的，不依赖外部服务。它使用 MiniSearch 对标题、小节、路径、正文和元数据做排序，并支持 `locale` 和 `kind` 作用域参数。

```txt
/api/search?q=cloudflare&locale=zh
```

## Algolia

把 `search.provider` 设成 `algolia`，并在运行环境里提供 `ALGOLIA_APP_ID`、`ALGOLIA_SEARCH_KEY`、`ALGOLIA_INDEX_NAME`。适合已经有 DocSearch 或托管索引流程的站点。

## Typesense

把 `search.provider` 设成 `typesense`，并提供 `TYPESENSE_HOST`、`TYPESENSE_SEARCH_KEY`，可选再配 `TYPESENSE_COLLECTION`。它适合想自托管、又要比较快的 typo tolerance 的场景。

## Cloudflare AI Search

这个提供商支持当前的 `ai_search` 和 `ai_search_namespaces` binding。默认不开启；本地 MiniSearch 仍然是默认搜索方案。

## 索引

```sh
svedocs index --provider cloudflare-ai-search --dry-run
svedocs index --provider cloudflare-ai-search --strategy replace --wait
```

索引会把 Markdown 文档上传成紧凑的 svedocs metadata，支持显式删除，并报告每条记录的失败情况。紧凑 metadata 会用一个 `svedocs` JSON 字段保存展示信息，同时把 `locale` 和 `kind` 作为可过滤字段。

## Ask AI

Ask AI 运行时路由支持 JSON 和 event-stream 响应。只要 binding 支持 `chatCompletions({ stream: true })`，Cloudflare AI Search 就可以返回原生流；其他提供商仍然会返回结构化的 answer / citation 事件。请求体可以带 `locale` 或 `kind`，默认主题会自动带上当前作用域。

## OpenAI 兼容

把 `ai.provider` 设成 `openai-compatible`，并提供 `OPENAI_COMPATIBLE_API_KEY`、`OPENAI_COMPATIBLE_MODEL`，以及可选的 `OPENAI_COMPATIBLE_BASE_URL`。这个 provider 会用本地 svedocs search records 组一段简短的 RAG prompt，适合 OpenAI、OpenRouter、Groq、Together 或私有网关这类兼容 Chat Completions 的服务。

如果你想完全接管细节，可以直接 import `createAlgoliaSearchProvider`、`createTypesenseSearchProvider`、`createCloudflareAiSearchProvider`、`createWorkersAiProvider` 或 `createOpenAiCompatibleProvider`，再把结果交给 `createSearchResponse` / `createAskResponse`。

## 限流

```ts
import { createCloudflareKvRateLimiter } from 'svedocs/ai';

const rateLimiter = createCloudflareKvRateLimiter({
  namespace: platform.env.SVEDOCS_RATE_LIMIT,
  windowMs: 60_000,
  max: 30
});
```

本地开发用内存限流，edge 部署用 KV 限流就够了。
