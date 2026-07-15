---
title: 集成
description: 为 svedocs 站点接入搜索、Ask AI、Cloudflare 部署、SEO 和 Open Graph。
order: 5
---

# 集成

不连接外部服务，也可以在本地构建和预览完整的 svedocs 站点。先使用内建方案，等站点确实需要时，再接入托管搜索、Ask AI、Cloudflare 绑定或自定义 OG 图片生成。

## 从哪里开始

| 能力 | 从哪里开始 | 什么时候进入生产配置 |
| --- | --- | --- |
| 搜索 | 根据页面生成的本地 MiniSearch 记录。 | 需要托管索引、拼写容错、搜索分析或 Cloudflare AI Search。 |
| Ask AI | 带本地引用的 `mock` 服务。 | 文档已经足够回答真实问题，而且生产环境已配置限流。 |
| Cloudflare | 关闭远程绑定的本地适配器配置。 | 需要边缘 SSR、AI Search、Workers AI 或 Pages 部署。 |
| SEO | 根据配置和 frontmatter 生成元数据。 | 公开页面需要 canonical URL、站点地图、robots、JSON-LD 和 OG 图片。 |
| OG 图片 | SVG 路由或构建期 SVG 资产。 | 需要 PNG 或自定义 Satori 模板，并能显式提供字体。 |

## 推荐顺序

1. 先写内容并运行 `svedocs check`。
2. 设置 `site.url`、description 和 canonical 行为。
3. 加入 sitemap、robots、可选 RSS 和 OG 路由。
4. 启用本地搜索，并确认小节结果有用。
5. 只有本地搜索不够时，再选择托管搜索服务。
6. 搜索记录和引用质量稳定后，再加入 Ask AI。
7. 最后加入 Cloudflare 绑定、限流和部署配置。

这样可以先判断搜索结果和引用是否可靠，再处理凭据与远程索引。

## 运行时路由

大多数集成都使用同一种 SvelteKit 路由模式：

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

这些响应工具会读取 `svedocs.config.ts`，并选择配置的服务。开发环境或静态构建缺少凭据和绑定时，可以改用本地实现。

## 构建期命令

构建期集成通过 CLI 命令完成：

```sh
svedocs check --strict
svedocs index --provider cloudflare-ai-search --dry-run
svedocs og --format svg --out static/og
svedocs deploy cloudflare setup --write
svedocs deploy cloudflare
```

凭据准备好之前，可以在 CI 中使用试运行。初始化命令会打印或写入生成文件，方便审查部署配置；部署命令则负责构建站点并通过 Wrangler 发布。

## 安全和运维

- 服务密钥放在运行时环境变量中，不要写入内容文件或提交到配置。
- 用 `.dev.vars.example` 记录本地需要哪些变量。
- 内存限流只适合本地开发。
- 生产 Ask AI 使用 KV 或其他共享限流。
- 搜索密钥应由服务端路由使用，不要把凭据直接放进客户端代码。
- 除非本地开发确实需要访问远程资源，否则保持 Cloudflare 远程绑定关闭。

## 本节内容

[搜索和 Ask AI](/docs/zh/integrations/search-ai "card: 服务选择、路由、索引、引用、流式响应和限流。")

[Cloudflare](/docs/zh/integrations/cloudflare "card: 构建预设、Wrangler 输出、AI Search 绑定、Workers AI 和本地开发。")

[SEO 和 OG](/docs/zh/integrations/seo-og "card: 元数据、canonical URL、站点地图、robots、JSON-LD、动态 OG 路由和构建期资源。")

## 选择路径

小型文档站通常只需要本地搜索、SVG OG 图片和静态输出。需要实时 AI、托管搜索或其他服务端功能时，再选择边缘模式。
