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

本地适配器默认关闭 `platformProxy.remoteBindings`，因此边缘构建和预渲染不需要 Cloudflare 账号。`platformProxy.persist` 也默认关闭，避免反复重启开发服务器后遇到 Miniflare 状态锁。`cloudflare.aiSearch.remote` 默认为 `false`；只有本地开发确实需要访问 Cloudflare 资源时才开启。

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
