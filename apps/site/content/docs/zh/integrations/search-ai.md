---
title: 搜索和 Ask AI
description: 配置本地搜索、Cloudflare AI Search、Ask AI、引用、流式响应和限流。
order: 2
---

# 搜索和 Ask AI

svedocs 会为每个页面和章节生成搜索记录。本地 MiniSearch、Algolia、Typesense、Cloudflare 索引和 Ask AI 引用都可以直接使用这些记录。

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

生成模板默认使用这条运行时路由。它会读取 `svedocs.config.ts`，选择 `local`、`algolia`、`typesense` 或 `cloudflare-ai-search`。缺少凭据或绑定时，路由会改用本地 MiniSearch。

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

`createConfiguredAskResponse` 会根据配置选择 `mock`、`cloudflare-ai-search`、`cloudflare-workers-ai` 或 `openai-compatible`。开发环境缺少凭据时，它会返回带本地引用的模拟回答，而不是直接报错。

## 本地搜索

本地搜索不依赖外部服务。MiniSearch 会根据标题、章节、路径、正文和元数据对结果排序；`locale` 和 `kind` 查询参数可以进一步限制结果范围。

```txt
/api/search?q=cloudflare&locale=zh
```

## Algolia

把 `search.provider` 设成 `algolia`，并在运行环境里提供 `ALGOLIA_APP_ID`、`ALGOLIA_SEARCH_KEY`、`ALGOLIA_INDEX_NAME`。适合已经有 DocSearch 或托管索引流程的站点。

## Typesense

把 `search.provider` 设为 `typesense`，并提供 `TYPESENSE_HOST`、`TYPESENSE_SEARCH_KEY`，还可以设置 `TYPESENSE_COLLECTION`。Typesense 适合需要自行托管并希望支持快速拼写纠错的团队。svedocs 通过 REST 调用它，不会给生成站点增加额外的运行时依赖。

## Cloudflare AI Search

这项集成支持当前的 `ai_search` 和 `ai_search_namespaces` 绑定。它需要主动开启，新站点默认使用本地 MiniSearch。

## 索引

```sh
svedocs index --provider cloudflare-ai-search --dry-run
svedocs index --provider cloudflare-ai-search --strategy replace --wait
```

索引命令会上传 Markdown 文档，可以显式删除旧记录，并逐条报告失败。展示信息存放在紧凑的 `svedocs` JSON 字段中，`locale` 和 `kind` 则继续作为可过滤字段保留。

## Ask AI

Ask AI 运行时路由支持 JSON 和事件流响应。只要绑定支持 `chatCompletions({ stream: true })`，Cloudflare AI Search 就可以直接传递 token 流；其他服务会返回结构化的回答和引用事件。请求体可以带上 `locale` 或 `kind`，默认主题会自动发送当前过滤条件。

## OpenAI 兼容

把 `ai.provider` 设为 `openai-compatible`，并提供 `OPENAI_COMPATIBLE_API_KEY`、`OPENAI_COMPATIBLE_MODEL`，还可以设置 `OPENAI_COMPATIBLE_BASE_URL`。svedocs 会根据本地搜索记录组合一段简短的 RAG 提示词，再发送给兼容 Chat Completions 的服务，例如 OpenAI、OpenRouter、Groq、Together 或私有网关。

需要自行控制路由细节时，可以直接导入 `createAlgoliaSearchProvider`、`createTypesenseSearchProvider`、`createCloudflareAiSearchProvider`、`createWorkersAiProvider` 或 `createOpenAiCompatibleProvider`，再把结果传给 `createSearchResponse` 或 `createAskResponse`。

## 限流

```ts
import { createCloudflareKvRateLimiter } from 'svedocs/ai';

const rateLimiter = createCloudflareKvRateLimiter({
  namespace: platform.env.SVEDOCS_RATE_LIMIT,
  windowMs: 60_000,
  max: 30
});
```

本地开发可以使用内存限流；边缘部署应改用基于 KV 的共享限流。

## 长对话与检索上下文

默认 Ask AI 面板保留可见对话，但每次请求只携带符合服务端消息数量、文本长度和 UTF-8 字节预算的最近历史。当前问题单独发送，避免重复计入。Workers AI 会收到当前语言和内容范围内检索到的正文片段及来源链接。

KV 限流器的存储 TTL 最少为 60 秒，以满足 Cloudflare KV 的要求；限流窗口仍按配置的 `resetAt` 判断。例如 10 秒窗口不会因为存储 TTL 而变成 60 秒。KV 的最终一致性意味着它适合近似限流，需要严格并发配额时应使用具备原子操作的存储。
