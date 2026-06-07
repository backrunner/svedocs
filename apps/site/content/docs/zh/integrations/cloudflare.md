---
title: Cloudflare
description: 把 svedocs 部署到 Cloudflare Pages，使用 edge SSR、静态输出、Workers AI 和 AI Search bindings。
order: 3
---

# Cloudflare

svedocs 的默认部署路径是 Cloudflare edge SSR。静态输出也是一等公民。SPA 输出则适合需要客户端兜底、但仍想预渲染已知页面的主机。

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

执行 `svedocs deploy cloudflare --write` 会根据当前配置生成一个基础版 `wrangler.toml`。

```toml title="wrangler.toml"
name = "my-docs"
compatibility_date = "2026-05-18"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[ai_search]]
binding = "SVEDOCS_AI_SEARCH"
instance_name = "svedocs"
```

如果你用的是 AI Search namespace，就把 `cloudflare.aiSearch.namespace` 配上，svedocs 会输出 `[[ai_search_namespaces]]`，而不是 `[[ai_search]]`。

`platformProxy.remoteBindings` 在本地 adapter 配置里默认关闭，这样 edge 构建和预渲染就不需要 Cloudflare 账号。`platformProxy.persist` 默认也关闭，用来避免反复重启 dev server 时遇到本地 Miniflare state 锁。`cloudflare.aiSearch.remote` 默认是 `false`；只有在你确实想让本地开发直连 Cloudflare 资源时，才主动打开远端 bindings。

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

生成的平台声明会给 `SVEDOCS_AI_SEARCH` binding 补上类型。Workers AI 可以通过 `ai.provider = 'cloudflare-workers-ai'` 开启，它会发出 `AI` binding。

AI Search 是可选项。默认项目会保留本地 MiniSearch 搜索，只有当 `search.provider` 或 `ai.provider` 设成 `cloudflare-ai-search` 时，才会生成对应的 AI Search binding。

## 本地开发

Cloudflare 相关路由要一直保留本地 fallback。模板里的 search route 使用 `createConfiguredSearchResponse`，所以没 binding 时会回退到本地 JSON 搜索。Ask AI route 使用 `createConfiguredAskResponse`，所以没有 AI Search、Workers AI 或 OpenAI-compatible 凭据时，会回退到 mock provider 和本地引用。

环境变量名请写在 `.dev.vars.example` 里，真实 token 不要提交进仓库。
