---
title: 自定义页面
description: 使用 Svelte 正文组件、命名布局和原生 SvelteKit 路由。
order: 4
---

# 自定义页面

文章使用 Markdown，需要交互或独立布局的页面可以使用 Svelte。[主题预览](/zh/theme-preview)就是正文组件接口的实际示例。

## 替换页面正文

先创建内容文件，让页面进入导航、搜索、SEO、多语言和 agent 接口：

```md title="content/pages/playground.md"
---
title: Playground
description: 试用可用选项。
layout: page
---

选择选项查看效果。这段文字也向搜索和 agent 客户端说明页面的用途。
```

在 Vite 插件中，把 canonical 路由映射到 Svelte 组件：

```ts title="vite.config.ts"
svedocs({
  pageComponents: {
    '/playground': '$lib/Playground.svelte'
  }
});
```

`pageComponents` 替换渲染的正文，也可以覆盖 SVX/MDX 正文。Markdown 文件仍用于元数据、搜索文本、标题目录和 markdown twins，应与组件展示的内容保持一致。路由键必须对应已有内容页面。多个语言共用一个组件时，需要分别注册各语言的路由。

```svelte title="src/lib/Playground.svelte"
<script lang="ts">
  import { useSvedocsTheme, resolveLocalizedHref } from 'svedocs/theme/headless';
  const theme = useSvedocsTheme();
  let count = $state(0);
</script>

<button onclick={() => count += 1}>{count}</button>
<a href={resolveLocalizedHref('/docs', $theme)}>{$theme.t('nav.docs')}</a>
```

在组件初始化时调用 `useSvedocsTheme()`。返回的 store 会随客户端页面和语言切换更新。正文组件通过这个上下文读取共享数据，不需要声明必填属性。

## 替换页面布局

通过 `svedocs({ layouts: { feature: '$lib/FeatureLayout.svelte' } })` 注册命名布局，再在 frontmatter 中设置 `layout: feature`。未注册的名称会产生包含页面路径和缺失布局名称的错误。

命名布局接收 `SvedocsCustomLayoutProps`。组合默认根组件时继续传递路由数据，搜索、导航、元数据和主题替换才能正常工作：

```svelte title="src/lib/FeatureLayout.svelte"
<script lang="ts">
  import { RootLayout } from 'svedocs/theme';
  import type { SvedocsCustomLayoutProps } from 'svedocs/theme/types';
  let { page, config, pages, tree, search, loadSearch, themeComponents,
    content: Content }: SvedocsCustomLayoutProps = $props();
</script>

<RootLayout {page} {config} {pages} {tree} {search} {loadSearch} {themeComponents}>
  <main id="content">
    <h1>{page.title}</h1>
    {#if Content}<Content />{:else}{@html page.html}{/if}
  </main>
</RootLayout>
```

如果改动应作用于所有文章或整个导航栏，使用[主题组件替换](/docs/zh/configuration/theme)，无需为每篇文章指定布局。

## 按需加载当前页

生成模板会按需加载页面数据、Svelte 正文和命名布局。已有项目可以在通用路由加载器中，从 `virtual:svedocs/page-index` 找到页面后，使用新的加载函数：

```ts
import { loadSvedocsPage } from 'svedocs/routes';
import pageLoaders from 'virtual:svedocs/page-loaders';
import componentLoaders from 'virtual:svedocs/component-loaders';
import layoutLoaders from 'virtual:svedocs/layout-loaders';

// 放入现有通用 +page.ts 的 load 函数中：
const loaded = await loadSvedocsPage(resolution.page, {
  pages: pageLoaders,
  components: componentLoaders,
  layouts: layoutLoaders
});
return { ...loaded, pages, tree, search: [], config };
```

这段逻辑应放在 `+page.ts`。服务端专用的 `+page.server.ts` 无法序列化 Svelte 组件函数。将加载结果传给渲染器：

```svelte
<DocsApp
  page={data.page} pages={data.pages} config={data.config}
  tree={data.tree} search={data.search}
  content={data.content} layout={data.layout}
  {themeComponents} {loadSearch}
/>
```

删除路由组件对 `virtual:svedocs/components` 和 `virtual:svedocs/layouts` 的导入，避免首屏拉取全部页面组件。这两个立即导入的模块及 `components`/`layouts` 属性仍兼容旧集成；显式传入的 `content` 和 `layout` 优先。

只有选中页面的加载器会执行，数据、正文和布局的导入并发进行。搜索记录仍可通过 `virtual:svedocs/search-loader` 延迟加载。默认目录组件会缓存标题位置，在布局变化后重新测量，避免每次滚动都读取所有标题的几何信息。

## 原生 SvelteKit 页面

工具页需要独立数据加载、表单 action 或身份认证时，可直接创建 `src/routes/tool/+page.svelte` 及普通 SvelteKit load/action 文件。需要共享站点外壳时组合 `RootLayout`，也可以使用自己的外壳和[无样式控制器](/docs/zh/reference/theme-components)。

原生路由不会自动进入内容清单。如果它需要出现在搜索、导航、站点地图或 agent 接口中，添加对应的 Markdown 内容文件，并与原生页面同步维护元数据和文本。
