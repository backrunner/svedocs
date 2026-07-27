---
title: Agent 接口
description: 输出 Markdown 孪生页面、llms.txt 和 llms-full.txt,并在 SSR 部署时把 agent 请求主动路由到 Markdown。
order: 5
---

# Agent 接口

svedocs 可以在 HTML 站点之外暴露一套 agent 可读接口,让编码 agent 和 AI 爬虫像浏览器一样顺畅地消费你的文档。这套接口包含:

- **Markdown 孪生** — 每个页面都可以通过 `<route>/index.md`(根页面为 `/index.md`)以 `text/markdown` 访问,带有 frontmatter、指向文档索引的引用块和末尾的 `Source:` 行。
- **`/llms.txt`** — 所有页面的索引,包含孪生链接和描述。
- **`/llms-full.txt`** — 单文件全量语料。
- **Agent 协商** — 在 edge(SSR)部署下,来自已知 AI agent UA 的请求,或更偏好 `Accept: text/markdown` 的请求,会直接收到 Markdown 孪生而不是 HTML。

## 配置

Agent 接口默认启用。可以通过 `agent` 配置段调整或关闭:

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  agent: {
    enabled: true,
    markdown: true, // 每页 Markdown 孪生
    llms: true, // /llms.txt 和 /llms-full.txt
    negotiation: {
      enabled: true, // 仅 SSR
      userAgents: ['ClaudeBot', 'GPTBot'], // 替换内置列表
      accept: true // 响应 Accept: text/markdown
    }
  }
});
```

用 `agent: false` 整体关闭,或用 `negotiation: false` 保留静态产物但不做请求改写。`llms` 依赖 Markdown 孪生,`markdown: false` 时索引文件会一同停用。

## 路由

生成的项目已经接好这些端点;旧项目可以手动添加:

```ts title="src/routes/llms.txt/+server.ts"
import { createLlmsTxtResponse } from 'svedocs/agent';
import config from 'virtual:svedocs/config';
import markdown from 'virtual:svedocs/markdown';
import pages from 'virtual:svedocs/page-index';
import type { RequestHandler } from './$types';

export const prerender = config.agent.enabled && config.agent.llms && config.agent.markdown;

export const GET: RequestHandler = ({ request }) => createLlmsTxtResponse(config, pages, markdown, request);
```

同样的模式覆盖 `/llms-full.txt`(`createLlmsFullTxtResponse`)和页面孪生(`src/routes/[...path]/index.md/+server.ts` 加 `src/routes/index.md/+server.ts` 中的 `createPageMarkdownResponse`),全部从 `svedocs/agent` 导出。每页的原始 Markdown 通过 `virtual:svedocs/markdown` 模块以「页面 id → Markdown 源」的映射提供。

标记了 `hidden: true` 或 `robots: noindex` 的页面会从孪生、`llms.txt` 和 `llms-full.txt` 中排除。多语言站点的索引文件只列出默认语言的页面。

## Agent 协商(SSR)

在 edge 部署下,添加一个 server hook,把 agent 流量在原始 URL 上直接路由到 Markdown:

```ts title="src/hooks.server.ts"
import { createSvedocsAgentHandle } from 'svedocs/agent';
import config from 'virtual:svedocs/config';
import markdown from 'virtual:svedocs/markdown';
import pages from 'virtual:svedocs/page-index';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = createSvedocsAgentHandle({ config, pages, markdown });
```

当请求的 `User-Agent` 包含配置中的 agent 标识(默认包含 ClaudeBot、GPTBot、PerplexityBot 等),或 `Accept` 头中 `text/markdown` 的优先级不低于 `text/html` 时,请求会被视为 agent 请求。命中的请求会收到带 `Vary: accept, user-agent` 的 Markdown 孪生响应,其余请求正常走页面渲染。

协商只在 `build.mode` 为 `'edge'` 时生效 —— static 和 SPA 构建没有服务端,agent 通过 `llms.txt` 和 `/index.md` URL 约定发现孪生内容。static 和 SPA 构建中,孪生和索引端点会被预渲染为纯静态文件。

预渲染的页面会作为静态资产在 Worker 之前直接返回,永远不可能经过协商。因此只要协商处于启用状态,`svedocsPagePrerender()` 在 edge 模式下会自动返回 `false`(页面走服务端渲染)—— 如果你自己在页面上设置 `prerender = true`,协商对该页面不生效。

## 边缘缓存

在 Cloudflare 上,协商产生的 Markdown 响应会自动写入 [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)(`caches.default`):

- **缓存键带内容版本** —— 每个 key 都嵌入 Markdown 语料的哈希,内容变更的部署会立即协商到全新的 key,无需手动 purge,旧条目自然过期。
- **TTL** 由 `negotiation.cache.maxAge` 控制(默认 `3600` 秒),只存在于存储的缓存条目上。
- **不会污染缓存** —— 返回给客户端的 Markdown 响应是 `private, max-age=0, must-revalidate`(带 ETag 用于再验证),因为 Cloudflare 边缘缓存会忽略 `Vary: accept, user-agent`,否则会在页面 URL 下把 Markdown 发给浏览器。只有独立 key 的 Cache API 条目携带共享 TTL。
- 只有协商出的 Markdown 响应(状态 200、`GET`)会被缓存。HTML 透传响应不会被 hook 存储,浏览器也永远读不到 agent 缓存条目。
- 平台提供 `waitUntil` 时缓存写入走 `waitUntil`,不会拖慢响应。

用 `negotiation: { cache: false }` 关闭缓存,或用 `negotiation: { cache: { maxAge: 86400 } }` 调整。在 Cloudflare 之外(没有 `caches.default`)的环境,hook 会透明地跳过缓存,协商仍然生效。
