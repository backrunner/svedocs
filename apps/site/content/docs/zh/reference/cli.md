---
title: CLI
description: 使用 svedocs CLI 创建、构建、检查、索引、生成 OG 资源，并准备 Cloudflare 部署。
order: 2
---

# CLI

`svedocs-cli` 提供两个可执行命令：`create-svedocs` 用于创建项目，`svedocs` 用于管理已有项目。未带 npm scope 的 `create-svedocs` 包只负责兼容各包管理器的 create 命令，所有行为都会转交给 `svedocs-cli`。

## 创建

```sh
pnpm create svedocs my-docs --template docs
npm create svedocs@latest my-docs -- --template docs
pnpm dlx --package svedocs-cli create-svedocs my-docs --template docs
svedocs create my-docs --template cloudflare
```

创建命令会先检查 `npm_config_user_agent`，再查看当前项目，以判断应使用哪个包管理器。如果都没有结果，就按顺序查找 `pnpm`、`npm`、`yarn` 和 `bun`。可以用 `--package-manager` 或 `--pm` 明确指定。默认只生成项目文件，不安装依赖；加上 `--install` 后会立即安装。

生成项目的 `package.json` 会声明 `svedocs` 和 `svedocs-cli` 依赖。它们都是普通的 npm 依赖，因此 `--install` 会通过选中的包管理器从 registry 安装，不会从 create 包里复制框架代码。

创建命令还会把当前 svedocs Agent Skills 安装到 `.agents/skills`，供 Codex 作为仓库级 skills 自动发现。无论使用 GitHub 模板还是内置回退模板，这一步都独立于 `--install` 执行。

默认使用当前 CLI 内置的模板，确保模板 API 与依赖版本一致。使用 `--channel beta` 可以基于 beta 包构建；使用 `--channel latest` 会优先选择 latest，并在 latest 不可用时自动回退到兼容的 beta 版本。只有显式设置 `SVEDOCS_TEMPLATE_SOURCE=github` 才会使用远程模板，并应通过 `SVEDOCS_TEMPLATE_REF=<tag|sha>` 固定版本。

模板：

| 模板 | 用途 |
| --- | --- |
| `minimal` | 轻量 SvelteKit 文档项目，带本地渲染。 |
| `docs` | 带本地 MiniSearch、站点地图、robots 和 OG 路由的文档站。 |
| `cloudflare` | 面向边缘运行时的项目，包含 Cloudflare Pages 配置和 AI Search 绑定示例。 |

## 升级

```sh
svedocs upgrade
svedocs upgrade 0.2.0
svedocs upgrade 0.2.0 --no-install
svedocs upgrade --check-only
```

升级命令会同时升级 `svedocs` 和 `svedocs-cli`，先检查当前版本到目标版本的跨度，再默认运行检测到的包管理器。使用 `--no-install` 可以只改写 `package.json`，使用 `--dry-run` 可以只预览依赖计划，使用 `--check-only` 可以只跑兼容性检查。

目前还没有登记破坏性变更规则。未来发布不兼容版本时，可以把规则关联到引入变更的版本；升级跨过该版本时，CLI 就能发出警告或停止操作，使用者仍可通过 `--force` 明确继续。

## 构建

```sh
svedocs build --mode edge
svedocs build --mode static
svedocs ssg
svedocs build --mode spa
```

`edge` 是默认值，面向 Cloudflare Pages SSR。`static` 和 `svedocs ssg` 会预渲染整个站点。`spa` 会预渲染已知页面，并为受限平台写出一个回退页。没有边缘运行时时，托管搜索、Ask AI 和其他服务端功能会改用本地实现。

## 检查

```sh
svedocs check --strict
svedocs check --translations
svedocs check --package
svedocs check --config ./svedocs.config.ts
```

检查项包括重复路由、重复 canonical URL、缺少页面描述、失效的内部链接和锚点、缺失的本地资源、空搜索输出、SPA 风险、公开文档与独立页面的翻译缺口，以及可选的包导出校验。

## 索引

```sh
svedocs index --format json --out static/search.json
svedocs index --format jsonl --out static/search.jsonl
svedocs index --provider cloudflare-ai-search --dry-run
```

Cloudflare AI Search 索引支持追加和替换两种策略：

```sh
svedocs index \
  --provider cloudflare-ai-search \
  --strategy replace \
  --existing old-id,stale-id \
  --delete manual-delete \
  --wait
```

设置 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN` 后即可上传记录。没有凭据时，命令只会试运行，不会修改远程索引。

## OG

```sh
svedocs og --format svg --out static/og
svedocs og --format png --out static/og
svedocs og --renderer satori --font ./Inter-Regular.ttf --format png
```

SVG 输出没有运行时依赖。PNG 输出会在生成时使用 Resvg。

## 部署

```sh
svedocs deploy cloudflare
svedocs deploy cloudflare setup
svedocs deploy cloudflare setup --write
```

`deploy cloudflare` 会构建当前 Cloudflare 输出，并执行 `wrangler pages deploy`。如果项目里还没有 `wrangler.toml` 或 `wrangler.jsonc`，命令会先初始化 Cloudflare Pages 配置和 `src/app.cloudflare.d.ts`。

`deploy cloudflare setup` 会预览生成的 `wrangler.toml` 和平台类型声明。加 `--write` 会创建文件；需要 `wrangler.jsonc` 时加 `--format jsonc`。
