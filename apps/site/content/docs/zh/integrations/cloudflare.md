---
title: Cloudflare
description: 把 svedocs 部署到 Cloudflare Pages，并配置边缘 SSR、静态输出、Workers AI 和 AI Search 绑定。
order: 3
---

# Cloudflare

svedocs 默认在 Cloudflare 上使用边缘 SSR，也可以输出完整的静态站点。对于必须依赖客户端路由的受限平台，还可以选择 SPA 输出，同时尽量保留已知页面的预渲染结果。

## 构建预设

```ts title="svelte.config.js"
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { createCloudflarePreset } from 'svedocs/cloudflare';

const preset = createCloudflarePreset(process.env.SVEDOCS_BUILD_MODE ?? 'edge');

export default {
  kit: {
    adapter: preset.adapter === '@sveltejs/adapter-cloudflare'
      ? adapterCloudflare({ platformProxy: { remoteBindings: false, persist: false } })
      : adapterStatic({ fallback: preset.mode === 'spa' ? '200.html' : undefined })
  }
};
```

## Wrangler

执行 `svedocs deploy cloudflare setup --write` 会根据当前配置生成一个基础版 `wrangler.toml`。更短的 `svedocs deploy cloudflare` 会先检查项目里是否已有 `wrangler.toml` 或 `wrangler.jsonc`；如果都没有，它会先写入初始化文件，再构建并通过 `wrangler pages deploy` 发布。

```toml title="wrangler.toml"
name = "my-docs"
compatibility_date = "2026-05-18"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[ai_search]]
binding = "SVEDOCS_AI_SEARCH"
instance_name = "svedocs"
```

如果使用 AI Search namespace，设置 `cloudflare.aiSearch.namespace` 后，svedocs 会输出 `[[ai_search_namespaces]]`，而不是 `[[ai_search]]`。

静态和 SPA 模式的 Cloudflare Pages 输出目录是 `build`。可以在初始化或部署时传入 `--mode static` 或 `--mode spa`；默认仍然输出边缘 SSR 构建。

本地适配器默认关闭 `platformProxy.remoteBindings`，因此边缘构建和预渲染不需要 Cloudflare 账号。不受本地支持的 AI Search binding 会从运行时 provider 解析中移除并回退到本地行为。需要在本地访问 Cloudflare 资源时，设置 `SVEDOCS_REMOTE_BINDINGS=true`。`platformProxy.persist` 也默认关闭，避免反复重启开发服务器后遇到 Miniflare 状态锁。

## 运行时类型

```ts title="svedocs.config.ts"
export default defineConfig({
  search: { provider: 'cloudflare-ai-search' },
  ai: { provider: 'cloudflare-ai-search' },
  cloudflare: {
    aiSearch: {
      binding: 'SVEDOCS_AI_SEARCH',
      instanceName: 'svedocs'
    }
  }
});
```

生成的平台声明会为 `SVEDOCS_AI_SEARCH` 绑定补充类型。把 `ai.provider` 设为 `cloudflare-workers-ai` 可以启用 Workers AI，并生成 `AI` 绑定。

AI Search 是可选项。新项目默认使用本地 MiniSearch；只有把 `search.provider` 或 `ai.provider` 设为 `cloudflare-ai-search` 后，才会生成对应的 AI Search 绑定。

## 本地开发

即使没有 Cloudflare 绑定，模板路由也能继续使用。搜索路由通过 `createConfiguredSearchResponse` 改用本地 JSON 搜索；Ask AI 路由通过 `createConfiguredAskResponse` 返回带本地引用的模拟回答。

需要哪些环境变量可以记录在 `.dev.vars.example` 中，真实令牌不要提交到仓库。

## 缓存公开的 SSR 页面

Markdown 在 Vite 构建时已经编译为 HTML，生产 SSR 不会再次解析。对于整页 HTML 不依赖 Cookie、请求头、用户身份或请求局部数据的公开文档，可以用 `createSvedocsHtmlCacheHandle` 在 Worker isolate 内复用渲染结果，按路由显式启用：

```ts title="src/hooks.server.ts"
import { building, dev } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import { createSvedocsAgentHandle } from 'svedocs/agent';
import { createSvedocsHtmlCacheHandle } from 'svedocs/cloudflare';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import markdown from 'virtual:svedocs/markdown';

export const handle = sequence(
  createSvedocsAgentHandle({ config, pages, markdown }),
  createSvedocsHtmlCacheHandle({
    config, pages,
    enabled: !dev && !building,
    include: (page) => page.kind === 'doc' && page.sourcePath.endsWith('.md')
      && (!page.frontmatter.layout || page.frontmatter.layout === 'docs'),
    maxAge: 60
  })
);
```

示例假定使用默认文档主题，没有依赖请求数据的页面替换。不要把个性化主题、自定义布局或依赖请求的 SSR 组件纳入缓存。认证逻辑应放在缓存外层，Agent 协商按示例放在缓存之前。

默认有效期 60 秒，最多 128 项，总正文大小 8 MiB，单页上限 512 KiB；可以通过 `maxAge`、`maxEntries`、`maxBytes` 和 `maxEntryBytes` 调整。超过大小限制或 100 ms 内未读取完的响应正常返回，不写入缓存。每次命中创建独立响应和正文，同时到达的可缓存请求共享填充过程。条目到期或容量不足时淘汰，新建 handle 或新部署从空缓存开始。这是内存缓存，不写 Cloudflare Cache API，也不添加公开缓存响应头。

带 Cookie、认证信息、查询参数、Range/前置条件、强制重新验证的请求，以及 Agent 协商和非页面路由都会绕过缓存。私有或 no-store 响应、渲染期间设置 Cookie、非 200 状态、`Vary`、已编码响应和带 nonce 的 CSP 不会写入。缓存支持 HEAD 和 ETag 条件 GET。static 与 SPA 模式始终绕过缓存；保留 `!building`、`!dev`，也让预渲染和开发模式禁用缓存。
