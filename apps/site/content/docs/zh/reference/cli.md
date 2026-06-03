---
title: CLI
description: 使用 svedocs CLI 创建、构建、检查、索引、生成 OG 资源，并准备 Cloudflare 部署。
order: 2
---

# CLI

`svedocs-cli` 提供两个项目二进制：`create-svedocs` 和 `svedocs`。未加 scope 的 `create-svedocs` 包只是给 package manager create 命令用的 shim，会转发到 `svedocs-cli`。

## 创建

```sh
pnpm create svedocs my-docs --template docs
npm create svedocs@latest my-docs -- --template docs
pnpm dlx --package svedocs-cli create-svedocs my-docs --template docs
svedocs create my-docs --template cloudflare
```

创建命令会先从 `npm_config_user_agent` 识别包管理器，再看当前项目，最后回退到 `pnpm`、`npm`、`yarn` 和 `bun`。可以用 `--package-manager` 或 `--pm` 覆盖。默认只脚手架，不会安装依赖；加 `--install` 就会立刻运行选中的包管理器。

模板会优先从 GitHub 拉取（默认 `backrunner/svedocs@main`），这样模板修复不需要重新发布 CLI。GitHub 不可用时会回退到 CLI 内置模板。设置 `SVEDOCS_TEMPLATE_SOURCE=bundled` 可以强制使用内置模板，设置 `SVEDOCS_TEMPLATE_SOURCE=github` 可以禁用回退，设置 `SVEDOCS_TEMPLATE_REF=<branch|tag|sha>` 可以固定远程模板版本。

模板：

| 模板 | 用途 |
| --- | --- |
| `minimal` | 轻量 SvelteKit 文档项目，带本地渲染。 |
| `docs` | 带本地 MiniSearch、站点地图、robots 和 OG 路由的文档站。 |
| `cloudflare` | 面向 edge 的项目，包含 Cloudflare Pages 配置和 AI Search binding 形状。 |

## 构建

```sh
svedocs build --mode edge
svedocs build --mode static
svedocs ssg
svedocs build --mode spa
```

`edge` 是默认值，面向 Cloudflare Pages SSR。`static` 和 `svedocs ssg` 会预渲染整个站点。`spa` 会预渲染已知页面并写出静态 fallback，适合受限主机；如果没有 edge runtime，托管 Search、Ask AI 和其他只运行在服务端的功能会退回到本地行为。

## 检查

```sh
svedocs check --strict
svedocs check --translations
svedocs check --package
svedocs check --config ./svedocs.config.ts
```

检查项包括重复路由、重复 canonical URL、缺少 description、内部链接断裂、锚点断裂、本地资源、空搜索输出、SPA 风险、可选的翻译缺口告警，以及可选的包导出校验。

## 索引

```sh
svedocs index --format json --out static/search.json
svedocs index --format jsonl --out static/search.jsonl
svedocs index --provider cloudflare-ai-search --dry-run
```

Cloudflare AI Search 索引支持 append 和 replace 两种策略：

```sh
svedocs index \
  --provider cloudflare-ai-search \
  --strategy replace \
  --existing old-id,stale-id \
  --delete manual-delete \
  --wait
```

设置 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN` 就能上传记录。没有凭据时，命令会保持 dry-run。

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
svedocs deploy cloudflare --write
```

dry-run 会打印生成的 `wrangler.toml` 和平台类型声明。`--write` 会创建 `wrangler.toml` 和 `src/app.cloudflare.d.ts`。需要 `wrangler.jsonc` 时加 `--format jsonc`。
