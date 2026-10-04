---
title: SEO 和 OG
description: 生成元数据、canonical URL、JSON-LD、站点地图、RSS、robots 和 Open Graph 图片。
order: 4
updatedTime: 2026-10-05
---

# SEO 和 OG

svedocs 会合并全局配置、frontmatter、路由元数据和页面生成结果，为每个页面生成 SEO 标签。

## Frontmatter

```md
---
title: 搜索和 Ask AI
description: 使用本地搜索、Cloudflare AI Search 和 Ask AI 服务。
canonical: https://svedocs.dev/docs/zh/integrations/search-ai
image: https://svedocs.dev/og/docs-search-ai.svg
author: svedocs team
published: 2026-05-18
updated: 2026-05-18
type: article
keywords:
  - SvelteKit
  - documentation
robots: index,follow
head:
  meta:
    - name: google-site-verification
      content: page-token
  jsonLd:
    - "@type": FAQPage
      name: Search FAQ
---
```

如果设置了 `site.url`，svedocs 会自动生成 canonical URL。

`head` 用来添加只属于当前页面的可序列化内容。全局 `seo.head` 会排在前面，随后追加页面 frontmatter 中的配置。默认根布局会自动渲染 `meta`、`link` 和额外的 JSON-LD。

## 元数据

默认根布局会渲染：

- `<title>` 和页面描述。
- canonical URL。
- Open Graph 和 Twitter card 标签。
- 文档页和单页的 JSON-LD。
- `keywords`、`robots` 和可序列化的 `head` 追加内容。
- 文章页面提供的作者 URL、发布时间和更新时间。

自定义布局可以调用 `createPageMetadata(config, page, pages)`。传入完整页面列表后，Open Graph 的语言映射只会包含真实存在的译文。

## 统一结构化数据实体

设置 `site.url` 后，页面拥有固定 `@id`：文档为 `<canonical>#article`，独立页面为 `<canonical>#webpage`。`isPartOf` 引用共享的 `<site.url>/#website`。当默认作者配置为 Organization，或全局 `seo.head.jsonLd` 提供了站点的 Organization 时，`publisher` 引用同一个组织实体；页面作者仍单独描述。

同一 `@id` 的自定义 JSON-LD 会合并，页面字段覆盖全局字段。URL 与 `site.url` 匹配的 WebSite、Organization 会复用自定义 ID；URL 与 canonical 匹配的页面实体也会合并。匿名 `@graph` 会展开并保留上下文，具名 graph 保持原结构。完全相同的匿名节点会去重，不同实体即使类型相同也会保留。建议显式设置 `@id`。

## 完全自定义 SEO 渲染

在 Vite 插件的 `theme.components.Seo` 注册 Svelte 组件，不需要替换整个布局：

```ts title="vite.config.ts"
svedocs({
  config: svedocsConfig,
  theme: { components: { Seo: '$lib/theme/Seo.svelte' } }
});
```

```svelte title="src/lib/theme/Seo.svelte"
<script lang="ts">
  import type { SvedocsSeoProps } from 'svedocs/theme/types';
  let { context, metadata, alternates, title, description, robots }: SvedocsSeoProps = $props();
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if robots}<meta name="robots" content={robots} />{/if}
  {#if metadata?.canonical}<link rel="canonical" href={metadata.canonical} />{/if}
  {#each alternates ?? [] as alternate}
    <link rel="alternate" hreflang={alternate.lang} href={alternate.href} />
  {/each}
  <meta name="author" content={context.config.seo.defaultAuthor} />
</svelte:head>
```

组件使用 `svedocs/theme/types` 导出的 `SvedocsSeoProps`，接收 `context`、`metadata`、`alternates`、`title`、`description`、`robots`，通过 `<svelte:head>` 输出所需标签。替换组件负责全部 SEO，包括 Open Graph、Twitter 和 JSON-LD；若只想增加标签，可在自定义组件内组合 `svedocs/theme` 导出的默认 `Seo`。错误页的 `metadata` 为 undefined。替换 `Root` 的布局需要自行接入 SEO 渲染器。

这个扩展点在 SSR、预渲染和客户端导航中都会执行，初始 SEO 输出不依赖客户端 effect。

## 文档语言与 URL 规则

生成模板通过 `createSvedocsHtmlHandle` 在服务端设置 `<html lang dir>`。已有项目应在 `src/hooks.server.ts` 接入，并通过 SvelteKit 的 `sequence` 与 agent 等 hook 组合：

```ts title="src/hooks.server.ts"
import { sequence } from '@sveltejs/kit/hooks';
import { createSvedocsHtmlHandle } from 'svedocs/routes';
import { createSvedocsAgentHandle } from 'svedocs/agent';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import markdown from 'virtual:svedocs/markdown';

export const handle = sequence(
  createSvedocsHtmlHandle({ config, pages }),
  createSvedocsAgentHandle({ config, pages, markdown })
);
```

`lang` 优先使用 locale 的 `hreflang`，再使用 locale code；`dir` 使用配置值，默认为 `ltr`，从右到左的语言需要设置 `dir: 'rtl'`。本地化 404 使用请求的语言。默认布局也带有这些属性，并在客户端导航后更新文档属性。

本地页面 URL 在 `edge` 模式不带尾斜杠，在 `static` 和 `spa` 模式带尾斜杠，根路径始终为 `/`。自动生成及同源自定义 canonical、hreflang、Open Graph URL、sitemap、RSS、面包屑、IndexNow 和解析后的内容链接共用规则。Canonical 移除 fragment，保留 query；外部 canonical、资源及接口 URL 保持各自路径规则。

## 禁用 JavaScript 时抓取

保留 `svedocsSsr()`、`svedocsPagePrerender()` 以及生成路由的 `entries()`。Edge 页面包含服务端渲染的正文和 SEO；static 以及 SPA 已知路由包含预渲染 HTML。禁用 JavaScript 后仍可读取标题、正文和链接。交互搜索、Ask AI、主题切换仍需要 JavaScript。SPA fallback 无法在无 JS 时提供未知路由的正文；需要抓取这些路由时应使用 edge SSR 或完整 static 输出。

## 站点地图、robots 和 RSS

```ts title="src/routes/sitemap.xml/+server.ts"
import { createSitemapResponse } from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import type { RequestHandler } from './$types';

export const prerender = config.seo.sitemap;

export const GET: RequestHandler = ({ request }) =>
  createSitemapResponse(config, pages, request);
```

sitemap 和 robots 默认开启。`createRobotsResponse(config, request)` 会生成对应的 `robots.txt`，并在 sitemap 关闭时移除其中的 sitemap 声明。隐藏页面和 `noindex` 页面不会进入 sitemap。生成模板会预渲染这两个端点，使用只含元数据的页面索引；动态服务时仍保留缓存头和 ETag。

RSS 默认关闭。可以设置 `seo.rss: true`，也可以通过对象配置 `title`、`description`、`limit` 和 `locale`。生成的 `/feed.xml` 路由调用 `createRssResponse(config, pages, request)`，只在 RSS 开启时预渲染，并自动把对应的 Feed 发现链接加入页面元数据。

## 动态 OG 路由

```ts title="src/routes/og/[...path]/+server.ts"
import { error } from '@sveltejs/kit';
import {
  createConfiguredOgImageFormat,
  createConfiguredOgImageRenderer,
  createConfiguredOgImageTemplate,
  createConfiguredPageOgImageEntries,
  createPageOgImagePath,
  createPageOgImageResponse,
  isOgImageEnabled
} from 'svedocs/og';
import config from 'virtual:svedocs/server-config';
import pages from 'virtual:svedocs/pages';

export const prerender = isOgImageEnabled(config) ? 'auto' : false;

const format = createConfiguredOgImageFormat(config);
const template = createConfiguredOgImageTemplate(config);

export function entries() {
  return createConfiguredPageOgImageEntries(config, pages);
}

export const GET = async ({ params }) => {
  if (!isOgImageEnabled(config)) error(404, 'OG images are disabled.');
  const requestPath = `/og/${params.path}`;
  const page = pages.find((candidate) => createPageOgImagePath(candidate, format) === requestPath);
  if (!page) error(404, `No OG image found for ${requestPath}`);
  return createPageOgImageResponse(config, page, {
    format,
    renderer: createConfiguredOgImageRenderer(config),
    ...(template ? { template } : {})
  });
};
```

分享图默认使用 PNG，通过 CLI 或 OG 路由的预渲染在构建期生成；动态 Cloudflare 请求无法调用 Node PNG 渲染器。需要边缘动态渲染时可显式选择 SVG。固定 OG URL 使用 `max-age=0, must-revalidate`，避免内容修改后继续缓存旧图片一年。如果静态托管覆盖了资源缓存规则，也应为 OG 图片设置重新验证。

自定义根布局可以用 `svedocs/og` 中的 `createJsonLdScript(value)` 配合 Svelte `{@html ...}` 渲染 JSON-LD。它会先转义可能影响脚本标签的字符，再返回完整的 `<script type="application/ld+json">` 标签。

## 构建期 OG 资源

先把默认值一次配好：

```ts title="svedocs.config.ts"
export default defineConfig({
  seo: {
    ogImage: {
      template: 'default',
      format: 'png',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
```

`svedocs build` 会在 Vite 复制静态文件前自动生成这些资源。CI 如果只需要应用包，可以加 `--no-og` 跳过。

## PNG 和 Satori

```sh
svedocs og --format png --out static/og
svedocs og --renderer satori --font ./Inter-Regular.ttf --format png
```

Satori 渲染需要显式指定字体文件，这样输出才会在不同机器和部署环境里保持稳定。

无论运行 `svedocs og`，还是通过 `svedocs build` 自动生成图片，`svedocs.config.ts` 中的函数模板都会保留。动态路由也可以在目标运行时支持时复用同一模板；否则应优先使用兼容性更好的默认 SVG 渲染器。

## 自动生成与 OG 路由

`svedocs build` 会先生成 OG 图片，再交给 Vite 复制到部署产物中。如果项目还提供 `/og/[...path]` 路由，将其 `prerender` 设为启用时的 `'auto'`（禁用时为 `false`）。这样已生成的静态图片可以满足对应路径，没有静态文件时仍会预渲染路由的 `entries()`。三个新建模板已采用对应配置；旧项目应同步更新，避免 SvelteKit 报告 OG 路由未被爬取。

## 标题、索引与结构化数据

在 frontmatter 中使用 `seoTitle`，可以单独设置搜索和分享标题，保留正文与导航标题。本地化首页不会重复追加站点名称。

```yaml
---
title: 组件
seoTitle: 主题组件参考
updatedTime: 2026-09-07
author: 文档团队
authorType: Organization
authorUrl: https://example.com/team
image: /images/components.png
imageAlt: 组件之间的关系
imageWidth: 1200
imageHeight: 630
imageType: image/png
---
```

`updatedTime` 用于 sitemap 的 `lastmod`、JSON-LD 的 `dateModified` 、文档页的文章修改时间标签和默认主题的更新时间。页面模型仍保留文件系统的 `lastUpdated`，但 SEO 不再引用它，避免重新检出仓库改变全站日期。没有可靠的编辑日期时，省略 `updatedTime` 即可。RSS 仅使用明确的更新或发布日期，缺失时省略日期。

页面 `robots` 与全局、页面 `head.meta` 中名为 `robots` 的标签按更严格的规则合并：页面的 `index` 不会覆盖全局 `noindex`。sitemap、hreflang、RSS 和 agent 发现入口使用同一规则。隐藏页仍不进入发现入口。`googlebot` 等专用标签保留其针对特定爬虫的语义。

默认主题基于当前语言下真实存在的上级页面生成 `BreadcrumbList`；通过 `head.jsonLd` 提供的自定义面包屑图会保留。团队作者可以设置 `seo.defaultAuthorType: 'Organization'` 或页面的 `authorType`；默认仍为 `Person`。`author` 是 JSON-LD 中的名称，`authorUrl` 是作者页面的 HTTP(S) URL（也支持相对站点 URL）；全局默认值为 `seo.defaultAuthorUrl`。Open Graph 的 `article:author` 只输出 URL，未提供时省略。页面覆盖作者名称后，不会继承另一位默认作者的 URL。`article:*` 标签仅用于 `og:type=article`，不会输出到 website 页面。

当 hreflang 没有地区信息时，可显式设置 i18n 语言的 `ogLocale`，例如 `{ code: 'en', hreflang: 'en', ogLocale: 'en_GB' }`。hreflang 保持原样，Open Graph 不会自行猜测地区。

PNG 的 SVG 渲染器使用构建环境中安装的字体。跨机器生成一致的中文图片时，应使用 Satori 和包含中文字形的显式 `--font` 文件，并在部署前生成静态资源。
