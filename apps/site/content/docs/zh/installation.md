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

`create-svedocs` 会把命令交给 `svedocs-cli`。CLI 优先从 GitHub 下载模板；GitHub 不可用时改用内置副本，然后更新项目名和包管理器。需要同时安装依赖时，加上 `--install`。

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

然后按需要添加路由。最小配置只要渲染 `svedocs/theme` 里的 `DocsApp`；生成模板都包含 sitemap、robots 和可选 RSS 路由，`docs` 和 `cloudflare` 还展示了完整的搜索、Ask AI 和 OG 配置。

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

`pnpm check` 会检查内容和路由；`pnpm build` 会确认 SvelteKit、svedocs Vite 插件、路由、主题和构建模式可以正常配合。

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
