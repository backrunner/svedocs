---
title: SEO 和 OG
description: 生成元数据、canonical URL、JSON-LD、站点地图、robots 和 Open Graph 图片。
order: 4
---

# SEO 和 OG

SEO 数据来自全局配置、frontmatter、路由元数据和页面生成结果。

## Frontmatter

```md
---
title: 搜索和 Ask AI
description: 使用本地搜索、Cloudflare AI Search 和 Ask AI 提供商。
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
  links:
    - rel: alternate
      href: /feed.xml
      type: application/rss+xml
      title: RSS
  jsonLd:
    - "@type": FAQPage
      name: Search FAQ
---
```

如果设置了 `site.url`，svedocs 会自动生成 canonical URL。

`head` 用来追加页面级的可序列化 head 内容。全局 `seo.head` 会先合并，然后追加页面 frontmatter 里的内容。默认 RootLayout 会自动渲染 `meta`、`link` 和额外 JSON-LD。

## 元数据

默认根布局会渲染：

- `<title>` 和 description。
- canonical URL。
- Open Graph 和 Twitter card 标签。
- 文档页和单页的 JSON-LD。
- `keywords`、`robots` 和可序列化的 `head` 追加内容。
- frontmatter 提供时的 author、published time 和 updated time。

自定义布局时可以直接用 `createPageMetadata(config, page)`。

## 站点地图和 robots

```ts title="src/routes/sitemap.xml/+server.ts"
import { createSitemapResponse } from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/pages';

export const GET = () => {
  return createSitemapResponse(config, pages);
};
```

`createRobotsResponse(config)` 可以生成对应的 `robots.txt` 响应。两个 response helper 会在对应的 `seo.sitemap` 或 `seo.robots` 被禁用时返回 `404`。

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
import config from 'virtual:svedocs/config';
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

SVG OG 路由适合 edge runtime。PNG 可以在构建期通过 CLI 生成。

自定义根布局可以用 `svedocs/og` 里的 `createJsonLdScript(value)` 配合 Svelte `{@html ...}` 渲染 JSON-LD。它会先转义 script 敏感字符，然后返回完整的 `<script type="application/ld+json">` 标签。

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

构建期 `svedocs og` 和自动生成的 `svedocs build` 会保留 `svedocs.config.ts` 里的函数模板。动态路由在目标运行时安全时可以复用同一套模板，否则优先用默认 SVG renderer。
