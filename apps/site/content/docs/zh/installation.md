---
title: 安装
description: 在新项目里安装 svedocs，接入已有 SvelteKit 应用，并保持框架依赖更新。
order: 2
---

# 安装

你可以直接生成一个新项目，也可以把 svedocs 加到已有 SvelteKit 应用里。新项目是最简单的路径，因为模板会包含路由结构、配置文件、内容目录和运行时端点。

## 环境要求

- Node.js 22 或更高版本。
- 使用 ESM 的 SvelteKit 项目。
- pnpm、npm、yarn 或 bun。模板默认偏向 pnpm，因为仓库本身使用 pnpm。

## 创建新项目

```sh
pnpm create svedocs my-docs --template docs
cd my-docs
pnpm install
pnpm dev
```

create 包只是 package manager create 命令的兼容 shim。它会转发到 `svedocs-cli`，优先从 GitHub 拉取选中的模板，必要时回退到 CLI 内置模板，改写项目名和 `packageManager` 字段，然后停止；只有传入 `--install` 时才会安装依赖。

模板里的依赖是普通 registry 依赖：

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

当 create 带 `--install` 运行时，选中的包管理器会从你配置的 registry 安装这些包。create 包不会把框架代码复制进项目。

## 选择模板

```sh
pnpm create svedocs my-docs --template minimal
pnpm create svedocs my-docs --template docs
pnpm create svedocs my-docs --template cloudflare
```

| 模板 | 包含内容 | 适合场景 |
| --- | --- | --- |
| `minimal` | 文档外壳和内容路由。 | 学习基础能力，或把文档嵌进已有应用。 |
| `docs` | 搜索、Ask AI fallback、sitemap、robots 和 OG 路由。 | 大多数产品文档站。 |
| `cloudflare` | `docs` 的全部内容，加 Wrangler 配置和 Cloudflare binding 示例。 | Cloudflare Pages 和 edge-first 项目。 |

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
pnpm add -D svedocs-cli
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
  }
});
```

注册 Vite 插件：

```ts title="vite.config.ts"
import { svedocs } from 'svedocs/vite';
import svedocsConfig from './svedocs.config';

export default {
  plugins: [
    svedocs({ config: svedocsConfig })
  ]
};
```

在根布局里引入默认主题样式：

```svelte title="src/routes/+layout.svelte"
<script>
  import 'svedocs/theme/styles.css';
</script>

<slot />
```

然后按需要添加路由。最简单的路由可以加载 `svedocs/theme` 里的 `DocsApp`；完整模板展示了搜索、Ask AI、sitemap、robots 和 OG 路由。

## 添加内容

创建内容目录和第一篇文档：

```sh
mkdir -p content/docs content/pages
```

```md title="content/docs/index.md"
---
title: Introduction
description: Start here to understand the product.
order: 1
---

# Introduction

Welcome to the docs.
```

## 验证安装

接入 hosted provider 前，先运行：

```sh
pnpm check
pnpm build
```

`pnpm check` 会验证内容 manifest。`pnpm build` 会确认 SvelteKit、svedocs Vite 插件、路由文件、主题引入和构建模式能一起工作。

## 升级 svedocs

生成的项目同时包含 `svedocs` 和 `svedocs-cli`。升级时应该一起升级：

```sh
svedocs upgrade
svedocs upgrade 0.2.0
svedocs upgrade 0.2.0 --no-install
svedocs upgrade --check-only
```

升级命令会在改依赖前检查当前版本到目标版本的跨度。现在还没有登记 breaking 规则，但兼容性检查层已经存在；未来有 breaking 版本时，可以在跨越对应版本时告警或阻断。

## 排查问题

| 现象 | 检查项 |
| --- | --- |
| 文档页面没有样式。 | 确认根布局引入了 `svedocs/theme/styles.css`。 |
| 编辑内容后路由没有更新。 | 确认 `vite.config.ts` 注册了 `svedocs({ config })`。 |
| 搜索路由本地可用但生产不可用。 | 确认生产运行时存在 provider 凭据或 Cloudflare bindings。 |
| `spa` 模式构建失败。 | 优先使用 `edge` 或 `static`；只有受限主机需要 fallback 时才使用 `spa`。 |
