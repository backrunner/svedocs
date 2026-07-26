---
title: SEO 和 OG
description: 生成元数据、canonical URL、JSON-LD、站点地图、RSS、robots 和 Open Graph 图片。
order: 4
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
- frontmatter 中提供的作者、发布时间和更新时间。

自定义布局可以调用 `createPageMetadata(config, page, pages)`。传入完整页面列表后，Open Graph 的语言映射只会包含真实存在的译文。

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

export const prerender = isOgImageEnabled(config);

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

SVG OG 路由适合边缘运行时。PNG 图片可以在构建期通过 CLI 生成。

自定义根布局可以用 `svedocs/og` 中的 `createJsonLdScript(value)` 配合 Svelte `{@html ...}` 渲染 JSON-LD。它会先转义可能影响脚本标签的字符，再返回完整的 `<script type="application/ld+json">` 标签。

## 构建期 OG 资源

先把默认值一次配好：

```ts title="svedocs.config.ts"
export default defineConfig({
  seo: {
    ogImage: {
      template: 'default',
      format: 'svg',
      outDir: 'static/og',
      renderer: 'svg'
    }
  }
});
```

`svedocs build` 会在 Vite 构建成功后自动生成这些资源。CI 如果只需要应用包，可以加 `--no-og` 跳过。

## PNG 和 Satori

```sh
svedocs og --format png --out static/og
svedocs og --renderer satori --font ./Inter-Regular.ttf --format png
```

Satori 渲染需要显式指定字体文件，这样输出才会在不同机器和部署环境里保持稳定。

无论运行 `svedocs og`，还是通过 `svedocs build` 自动生成图片，`svedocs.config.ts` 中的函数模板都会保留。动态路由也可以在目标运行时支持时复用同一模板；否则应优先使用兼容性更好的默认 SVG 渲染器。
