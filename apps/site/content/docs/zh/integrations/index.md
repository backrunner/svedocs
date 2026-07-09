---
title: 集成
description: 连接搜索、Ask AI、Cloudflare 部署、SEO 和 Open Graph，同时保留本地 fallback。
order: 5
---

# 集成

svedocs 的集成设计围绕一个原则：文档站应该先在本地可靠工作，再接入外部服务。Hosted search、Ask AI、Cloudflare bindings 和 OG 生成，都可以在内容模型稳定后逐步加入。

## 集成地图

| 能力 | 从哪里开始 | 什么时候进入生产配置 |
| --- | --- | --- |
| 搜索 | 由 manifest 生成的本地 MiniSearch 记录。 | 需要 hosted index、拼写容错、分析能力或 Cloudflare AI Search。 |
| Ask AI | 带本地引用的 mock provider。 | 文档内容足够回答真实问题，并且能做限流。 |
| Cloudflare | 本地 adapter 配置，并关闭 remote bindings。 | 需要 edge SSR、AI Search、Workers AI 或 Pages 部署。 |
| SEO | 从配置和 frontmatter 生成 metadata。 | 公开页面需要 canonical URL、sitemap、robots、JSON-LD 和 OG 图片。 |
| OG 图片 | SVG 路由或构建期 SVG 资产。 | 需要 PNG 或自定义 Satori 模板，并能显式提供字体。 |

## 推荐顺序

1. 先写内容并运行 `svedocs check`。
2. 设置 `site.url`、description 和 canonical 行为。
3. 加入 sitemap、robots 和 OG 路由。
4. 启用本地搜索，并确认小节结果有用。
5. 只有本地搜索不够时，再选择 hosted search provider。
6. 搜索记录和引用质量稳定后，再加入 Ask AI。
7. 最后加入 Cloudflare bindings、限流和部署配置。

这个顺序能避免在内容树还频繁变化时，就开始调试 provider 凭据。

## 运行时路由模式

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

configured helpers 会读取 `svedocs.config.ts`，在凭据或 bindings 存在时使用 hosted provider，并为开发环境和静态构建保留本地 fallback。

## 构建期模式

构建期集成通过 CLI 命令完成：

```sh
svedocs check --strict
svedocs index --provider cloudflare-ai-search --dry-run
svedocs og --format svg --out static/og
svedocs deploy cloudflare setup --write
svedocs deploy cloudflare
```

在凭据准备好之前，CI 里优先使用 dry-run。setup 命令会打印或写入生成结果，让部署配置可以被 review；deploy 命令随后会构建并通过 Wrangler 发布。

## 安全和运维

- Provider key 放在运行时环境变量里，不要写入内容文件或提交到配置。
- 用 `.dev.vars.example` 记录本地需要哪些变量。
- 内存限流只适合本地开发。
- 生产 Ask AI 使用 KV 或其他共享限流。
- 搜索 key 优先走服务端路由，不要把凭据直接放进客户端代码。
- 除非明确需要本地开发修改远程资源，否则 Cloudflare remote bindings 保持关闭。

## 本节内容

[搜索和 Ask AI](/docs/zh/integrations/search-ai "card: Provider、路由、索引、引用、流式响应和限流。")

[Cloudflare](/docs/zh/integrations/cloudflare "card: 构建 preset、Wrangler 输出、AI Search bindings、Workers AI 和本地开发。")

[SEO 和 OG](/docs/zh/integrations/seo-og "card: Metadata、canonical URL、sitemap、robots、JSON-LD、动态 OG 路由和构建期资产。")

## 选择路径

如果你在做小型文档站，从本地搜索、SVG OG 图片和静态输出开始。如果你在做带实时 AI 或 hosted search 的产品文档站，使用 edge 模式，并在内容结构可靠后再加入 hosted integrations。
