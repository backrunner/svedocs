---
title: 安装
description: 在新项目里安装 svedocs，接入已有 SvelteKit 应用，并保持框架依赖更新。
order: 2
---

# 安装

你可以生成一个新项目，也可以把 svedocs 加到已有的 SvelteKit 应用里。新站点通常用模板更省事，因为路由、配置、内容目录和服务端接口都已经准备好了。

## 环境要求

- Node.js 20.19 或更高版本。
- 使用 ESM 的 SvelteKit 项目。
- pnpm、npm、yarn 或 bun。模板默认偏向 pnpm，因为仓库本身使用 pnpm。

## 创建新项目

```sh
pnpm create svedocs my-docs --template docs
cd my-docs
pnpm install
pnpm dev
```

`create-svedocs` 会把命令交给 `svedocs-cli`。CLI 使用当前版本内置的模板，并让 framework 与 CLI 依赖保持同一版本。使用 `--channel beta` 可以基于 beta 包构建；使用 `--channel latest` 会优先使用 latest，不可用时自动回退到兼容 beta。需要同时安装依赖时，加上 `--install`。

每个模板还会把当前 svedocs Agent Skills 写入 `.agents/skills`。Codex 会把它们作为仓库级 skills 自动发现，因此创建完成后即可使用项目专属的接入、配置、主题、Landing 和多语言指引。

模板使用普通的 npm 软件源依赖：

```json title="package.json"
{
  "dependencies": {
    "svedocs": "latest"
  },
  "devDependencies": {
    "svedocs-cli": "latest"
  }
}
```

使用 `--install` 后，CLI 会调用你选择的包管理器安装这些依赖，不会把框架源码复制到项目里。

## 选择模板

```sh
pnpm create svedocs my-docs --template minimal
pnpm create svedocs my-docs --template docs
pnpm create svedocs my-docs --template cloudflare
```

| 模板 | 包含内容 | 适合场景 |
| --- | --- | --- |
| `minimal` | 文档外壳、sitemap、robots 和可选 RSS 路由。 | 学习基础能力，或把文档嵌进已有应用。 |
| `docs` | 搜索、可本地回退的 Ask AI、sitemap、robots、可选 RSS 和 OG 路由。 | 大多数产品文档站。 |
| `cloudflare` | `docs` 的全部内容，加 Wrangler 配置和 Cloudflare 绑定示例。 | Cloudflare Pages 和以边缘运行为主的项目。 |

远程模板行为可以用环境变量控制：

| 变量 | 作用 |
| --- | --- |
| `SVEDOCS_TEMPLATE_SOURCE=bundled` | 强制使用 CLI 内置模板。 |
| `SVEDOCS_TEMPLATE_SOURCE=github` | 必须从 GitHub 拉取，失败时不回退。 |
| `SVEDOCS_TEMPLATE_REF=<branch|tag|sha>` | 固定远程模板版本。 |
| `SVEDOCS_TEMPLATE_REPOSITORY=<owner/repo>` | 从其他仓库拉取模板。 |

## 接入已有应用

安装框架和 CLI：

```sh
pnpm add svedocs
pnpm add -D svedocs-cli @tailwindcss/vite tailwindcss
```

创建 `svedocs.config.ts`：

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation for my product',
    url: 'https://example.com'
  },
  content: {
    root: 'content',
    docs: 'content/docs',
    pages: 'content/pages'
  },
  ai: false
});
```

注册 Vite 插件：

```ts title="vite.config.ts"
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

export default defineConfig({
  plugins: [svedocs({ config: svedocsConfig }), tailwindcss(), sveltekit()]
});
```

在根布局里引入默认主题样式：

```svelte title="src/routes/+layout.svelte"
<script lang="ts">
  import 'svedocs/theme/styles.css';
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
```

合并配置时，保留应用已有的 SvelteKit 插件和布局内容。这份最小配置使用本地搜索，暂时关闭 Ask AI，等添加对应的运行时路由后再启用。

在 `svelte.config.js` 中注册内容扩展名和预处理器。下面使用 `adapter-auto`；已有部署目标的应用应保留当前 adapter 和其他 `kit` 设置。如果直接使用此示例，请将 `@sveltejs/adapter-auto` 安装为开发依赖。

```js title="svelte.config.js"
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svedocsPreprocess, svedocsSvelteExtensions } from 'svedocs/svelte';

export default {
  extensions: svedocsSvelteExtensions,
  preprocess: [vitePreprocess(), svedocsPreprocess()],
  kit: { adapter: adapter() }
};
```

### 加载当前文档

创建下面的兜底路由。它处理多语言 URL，为未知文档返回真正的 404，并按需加载当前页面和正文组件。应用已有的具体 SvelteKit 路由优先于此兜底路由。

```ts title="src/routes/[...path]/+page.ts"
import componentLoaders from 'virtual:svedocs/component-loaders';
import layoutLoaders from 'virtual:svedocs/layout-loaders';
import { loadSvedocsPage } from 'svedocs/routes';
import { error, redirect } from '@sveltejs/kit';
import config from 'virtual:svedocs/config';
import pageLoaders from 'virtual:svedocs/page-loaders';
import pages from 'virtual:svedocs/page-index';
import tree from 'virtual:svedocs/tree';
import { svedocsPagePrerender } from 'svedocs/cloudflare';
import type { SvedocsPage } from 'svedocs/core';
import { createSvedocsRouteEntries, resolveSvedocsPageRoute } from 'svedocs/routes';
import type { PageLoad } from './$types';

export const prerender = svedocsPagePrerender(undefined, config);

export function entries() {
  return createSvedocsRouteEntries(pages, config)
    .map((path) => ({ path: path.replace(/^\//, '') }));
}

export const load: PageLoad = async ({ params }) => {
  const routePath = `/${params.path ?? ''}`.replace(/\/$/, '') || '/';
  const resolution = resolveSvedocsPageRoute(routePath, pages, config);
  if (resolution.status === 'redirect') redirect(307, resolution.location);
  if (resolution.status === 'missing') error(404, `No page found for ${routePath}`);
  const pageIndex = resolution.page;
  const loaded = await loadSvedocsPage(pageIndex, { pages: pageLoaders, components: componentLoaders, layouts: layoutLoaders });
  const { page } = loaded;
  return { ...loaded, pages: mergeCurrentPage(pages, page), search: [], tree, config };
};

function mergeCurrentPage(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
  return pages.map((page) => page.id === current.id ? current : page);
}
```

### 渲染文档

把加载好的页面和主题组件传给 `DocsApp`。搜索索引会在需要时加载。

```svelte title="src/routes/[...path]/+page.svelte"
<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import themeComponents from 'virtual:svedocs/theme-components';
  import loadSearch from 'virtual:svedocs/search-loader';
  export let data;
</script>

<DocsApp page={data.page} pages={data.pages} tree={data.tree} search={data.search} config={data.config} content={data.content} layout={data.layout} {themeComponents} {loadSearch} />
```

如果项目还没有引用虚拟模块类型，在 `src/app.d.ts` 中添加：

```ts title="src/app.d.ts"
/// <reference types="svedocs/virtual" />
```

现在 `/docs` 和未被现有路由占用的独立内容页面都可以渲染，应用可以保留原来的首页。之后再按需添加[搜索和 Ask AI 接口](/docs/zh/integrations/search-ai)、[SEO 路由](/docs/zh/integrations/seo-og)和 [Agent 路由](/docs/zh/integrations/agent-interface)；生成模板已经包含这些接线。

## 添加内容

创建内容目录和第一篇文档：

```sh
mkdir -p content/docs content/pages
```

```md title="content/docs/index.md"
---
title: 介绍
description: 从这里开始了解产品。
order: 1
---

# 介绍

欢迎阅读产品文档。
```

## 验证安装

接入托管服务前，先运行：

```sh
pnpm check
pnpm build
```

`pnpm check` 运行应用的 Svelte 和 TypeScript 检查。另行运行 `pnpm exec svedocs check --strict`，检查内容链接、页面描述和翻译缺口。用 `pnpm dev` 打开 `/docs`，再运行 `pnpm build` 验证它与当前 adapter 的配合。

## 升级 svedocs

生成的项目同时包含 `svedocs` 和 `svedocs-cli`。升级时应该一起升级：

```sh
svedocs upgrade
svedocs upgrade 0.2.0
svedocs upgrade 0.2.0 --no-install
svedocs upgrade --check-only
```

升级命令会先检查目标版本是否跨过已知的破坏性更新，再修改依赖。目前还没有需要特殊处理的迁移规则，以后可以随版本补充。

## 排查问题

| 现象 | 检查项 |
| --- | --- |
| 文档页面没有样式。 | 确认根布局引入了 `svedocs/theme/styles.css`。 |
| 编辑内容后路由没有更新。 | 确认 `vite.config.ts` 注册了 `svedocs({ config })`。 |
| 搜索路由本地可用但生产不可用。 | 确认生产环境已经配置搜索服务凭据或 Cloudflare 绑定。 |
| `spa` 模式构建失败。 | 优先使用 `edge` 或 `static`；只有主机必须依赖客户端回退时才使用 `spa`。 |
