---
title: 组件
description: 查看每个可替换 svedocs 主题组件的 props、职责和 headless controller。
order: 4
---

# 组件

svedocs 的主题由可替换 Svelte 组件和无样式行为 helper 组成。当你要替换默认 navbar、文章壳层、搜索 UI、Ask AI 面板、ToC、footer 或浮动页面工具时，可以按这页的契约实现。

## 导入路径

```ts
import { DocsApp, Navbar, Article, SearchDialog } from 'svedocs/theme';
import { createSearchController, createAskAiController } from 'svedocs/theme/headless';
import type {
  SvedocsThemeComponentMap,
  SvedocsNavbarProps,
  SvedocsArticleProps
} from 'svedocs/theme/types';
```

`svedocs/theme` 会导出默认组件，也会重新导出 headless helpers 和公开类型。开发主题包时，建议优先从 `svedocs/theme/headless` 和 `svedocs/theme/types` 做更明确的导入。

## 组件映射

在 Vite 插件里注册构建期替换组件：

```ts title="vite.config.ts"
svedocs({
  theme: {
    components: {
      Navbar: '$lib/theme/Navbar.svelte',
      Article: '$lib/theme/Article.svelte',
      Search: '$lib/theme/Search.svelte',
      AskAi: '$lib/theme/AskAi.svelte'
    }
  }
});
```

生成的路由会导入 `virtual:svedocs/theme-components` 并把映射传给 `DocsApp`。你也可以手动传入：

```svelte
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  components={contentComponents}
  layouts={layouts}
  themeComponents={{ Navbar: CustomNavbar }}
  loadSearch={loadSearch}
/>
```

映射类型是：

| Key | 默认组件 | Props 类型 |
| --- | --- | --- |
| `Root` | `RootLayout` | `SvedocsRootProps` |
| `Layout` | `LayoutShell` | `SvedocsLayoutShellProps` |
| `Docs` | `DocsLayout` | `SvedocsDocsLayoutProps` |
| `DocsShell` | `DocsShell` | `SvedocsDocsShellProps` |
| `Page` | `PageLayout` | `SvedocsPageLayoutProps` |
| `PageShell` | `PageShell` | `SvedocsPageShellProps` |
| `Home` | `HomePage` | `SvedocsHomeLayoutProps` |
| `Error` | `ErrorPage` | `SvedocsErrorProps` |
| `Brand` | `Brand` | `SvedocsBrandProps` |
| `TopNav` | `TopNav` | `SvedocsTopNavProps` |
| `Header` | `Navbar` | `SvedocsHeaderProps` |
| `Navbar` | `Navbar` | `SvedocsNavbarProps` |
| `MobileNav` | `MobileNav` | `SvedocsMobileNavProps` |
| `SocialNav` | `SocialNav` | `SvedocsSocialNavProps` |
| `Sidebar` | `SidebarTree` | `SvedocsSidebarProps` |
| `Article` | `Article` | `SvedocsArticleProps` |
| `Toc` | `TableOfContents` | `SvedocsTocProps` |
| `Search` | `SearchDialog` | `SvedocsSearchProps` |
| `AskAi` | `AskAiPanel` | `SvedocsAskAiProps` |
| `Footer` | `Footer` | `SvedocsFooterProps` |
| `FooterLinks` | `FooterLinks` | `SvedocsFooterLinksProps` |
| `ThemeToggle` | `ThemeToggle` | `SvedocsThemeToggleProps` |
| `PageTools` | `PageTools` | `SvedocsPageToolsProps` |
| `RenderError` | `RenderError` | `SvedocsRenderErrorProps` |

## 共享上下文

多数 shell 组件会收到 `SvedocsThemeContext`。

| 字段 | 说明 |
| --- | --- |
| `config` | 解析后的 `svedocs.config.ts`。 |
| `page` | 当前页面。 |
| `pages` | 完整页面 manifest。 |
| `tree` | 当前文档作用域的导航树。 |
| `search` | 路由里已加载的搜索记录。 |
| `loadSearch` | 延迟搜索记录加载器，通常来自 `virtual:svedocs/search-loader`。 |
| `searchScope` | 根据 `search.scope` 和当前 locale 推导出的搜索过滤条件。 |
| `aiScope` | 根据 `ai.scope` 和当前 locale 推导出的 Ask AI 过滤条件。 |
| `surface` | `home` 或 `reading`。 |
| `isDocsPage` | 当前页面是否是文档文章。 |
| `activeNavHref` | 归一化后的当前 top-nav href。 |

自定义 shell 可以用 `createThemeContext` 创建同样的对象。

## DocsApp

`DocsApp` 是完整路由渲染器。需要自动接好路由、metadata、layout、slots 和替换组件时，继续使用它即可。

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `page` | `SvedocsPage` | 必填，当前页面。 |
| `config` | `SvedocsResolvedConfig` | 必填，解析后的配置。 |
| `pages` | `SvedocsPage[]` | 可选，默认 `[]`。 |
| `tree` | `SvedocsTreeItem[]` | 可选，默认 `[]`。 |
| `search` | `SvedocsSearchRecord[]` | 可选，默认 `[]`。 |
| `components` | `Record<string, Component>` | 编译后的 `.svx` / `.mdx` 页面组件。 |
| `layouts` | `Record<string, Component>` | 命名单页布局。 |
| `themeComponents` | `Partial<SvedocsThemeComponentMap>` | 主题组件替换。 |
| `loadSearch` | `SvedocsRecordLoader` | 延迟搜索记录加载器。 |

Slots：`background`、`landing`、`home-hero-visual`、`home-features` 和 `doc-header`。

## Root

`Root` 负责文档 metadata、主题初始化脚本、路由 hydration 状态、滚动条显隐行为和共享背景 slot。默认的可视外壳是 `Layout`。

| Prop | 说明 |
| --- | --- |
| `config` | 必填，解析后的配置。 |
| `page`、`pages`、`tree`、`search`、`loadSearch` | 用来创建 `SvedocsThemeContext`。 |
| `mobileTree`、`mobileCurrentPath` | 移动端文档导航数据。 |
| `hasBackgroundSlot` | 强制开启或关闭背景 slot 分支。 |
| `themeComponents` | 继续传给嵌套的可替换组件。 |

默认 root 会把 `<slot />` 渲染成页面主体，把 `<slot name="background" />` 渲染成装饰背景层。

## 布局组件

`Docs`、`Page`、`Home` 和 `Error` 是 `DocsApp` 与生成路由使用的页面级布局。想保留框架路由、metadata 和内容加载，但换一套页面 shell 时可以替换它们。`Error` 会用同一个主题 root、header、footer、搜索、明暗模式和 `noindex` metadata 渲染 SvelteKit 错误页；生成模板已经包含 `src/routes/+error.svelte`。

| 组件 | 说明 |
| --- | --- |
| `Docs` | 文档文章 shell，包含 sidebar、article 和 ToC。 |
| `Page` | 独立页面 shell。 |
| `Home` | 首页 shell 和入口卡片。 |
| `Error` | 接收 `status`、`message`、`error`、`path`、config、manifest data、search 和 `themeComponents`。 |

`Docs`、`Page` 和 `Home` 都会接收当前 `page`、`pages`、`tree`、`search`、`config`、`loadSearch`、页面 `content` 和 `themeComponents`，替换布局时可以复用和内置主题一样的导航与运行时数据。

## 基础布局组件

`Layout`、`DocsShell` 和 `PageShell` 是更底层的可视布局组件。当主题只需要换外层框架或内容几何结构、不想重写页面级行为时，替换它们即可。

| 组件 | 说明 |
| --- | --- |
| `Layout` | `Root` 内部的站点框架：skip link、header、背景 slot、默认 slot、Ask AI、页面工具和 footer。 |
| `DocsShell` | 文档内容几何结构：sidebar、article 区域和 ToC。 |
| `PageShell` | 独立页面正文和错误页正文。支持 `variant="page"` 和 `variant="error"`。 |

`Layout` 接收 `SvedocsLayoutShellProps`，包含 `context`、`themeStyle`、移动导航状态、`themeComponents` 和移动端回调。替换它时，应继续渲染默认 slot、在 `hasBackgroundSlot` 为 true 时渲染 `background` slot，并提供 header/footer 或你自己的等价区域。

`DocsShell` 接收 `page`、`navigationTree`、`content`、`context`、`tocController`、`hasDocHeaderSlot` 和 `themeComponents`。默认 shell 仍然会委托给可替换的 `Sidebar`、`Article` 和 `Toc`。

`PageShell` 接收可选的 `page`、`variant`、`title`、`description`、`kicker`、`content`、`html`、`status`、`path` 和 `actions`。默认 `Page` 和 `Error` 都会使用它，所以替换 `PageShell` 可以同时更新普通独立页和默认错误页。

## Navbar

`Navbar` 渲染品牌、主导航、搜索、locale/version switcher、社交链接、主题切换和移动端导航。`Header` 是 `Navbar` 的别名替换点；默认 navbar 会组合 `Brand`、`TopNav`、`SocialNav`、`Search`、`ThemeToggle` 和 `MobileNav`。

| Prop | 说明 |
| --- | --- |
| `context` | 必填，`SvedocsThemeContext`。 |
| `mobileTree`、`mobileCurrentPath` | 移动端菜单使用的文档树和当前路径。 |
| `mobileMenuId`、`mobileMenuOpen` | 由 `Root` 管理的无障碍状态。 |
| `themeComponents` | 默认 navbar 会用它渲染自定义 `Search`、`ThemeToggle` 和 `MobileNav`。 |
| `onToggleMobileMenu`、`onCloseMobileMenu` | 来自移动导航 controller 的回调。 |

最小自定义 navbar：

```svelte title="src/lib/theme/Navbar.svelte"
<script lang="ts">
  import type { SvedocsNavbarProps } from 'svedocs/theme/types';
  export let context: SvedocsNavbarProps['context'];
</script>

<header>
  <a href={context.config.theme.brand.href}>{context.config.theme.brand.label}</a>
</header>
```

## MobileNav

`MobileNav` 在响应式顶部菜单里渲染文档导航。

| Prop | 说明 |
| --- | --- |
| `items` | `SvedocsTreeItem[]`，默认 `[]`。 |
| `currentPath` | 用于 active link 状态的当前路由路径。 |
| `themeComponents` | 默认移动导航可复用自定义 `Sidebar`。 |

当移动端导航和桌面侧栏需要不同布局时，替换它。

## Sidebar

`Sidebar` 渲染递归文档导航。

| Prop | 说明 |
| --- | --- |
| `items` | `SvedocsTreeItem[]`，默认 `[]`。 |
| `currentPath` | 当前路由路径。 |
| `depth` | 递归渲染的层级深度。 |

自定义侧栏应保留普通链接，并给当前项设置 `aria-current="page"`。

## Article

`Article` 渲染文档文章标题区、prose body、编辑链接、更新时间和上一页/下一页导航。

| Prop | 说明 |
| --- | --- |
| `page` | 必填，当前页面。 |
| `content` | `.svx` / `.mdx` 编译后的 Svelte 内容组件；没有时使用 `page.html`。 |
| `context` | 可选，`SvedocsThemeContext`。 |
| `hasDocHeaderSlot` | 强制开启或关闭 `doc-header` slot 分支。 |
| `themeComponents` | 继续传给默认 article，用于渲染自定义 `RenderError`。 |

默认 article 提供 `doc-header` slot，传入 `page` 和 `breadcrumbs`。替换组件时，要继续渲染 `content` 或 `page.html`，并保留清晰的 article landmark。

```svelte
<script lang="ts">
  import type { SvedocsArticleProps } from 'svedocs/theme/types';
  export let page: SvedocsArticleProps['page'];
  export let content: SvedocsArticleProps['content'];
</script>

<article>
  <h1>{page.title}</h1>
  {#if content}<svelte:component this={content} />{:else}{@html page.html}{/if}
</article>
```

## Toc

`Toc` 渲染页面标题，并跟踪当前 active heading。

| Prop | 说明 |
| --- | --- |
| `page` | 必填，带 `headings` 的当前页面。 |
| `controller` | 可选，`SvedocsTocController`；`DocsLayout` 会传入共享 controller。 |

自定义 layout 中如果 ToC 和文章正文需要共享 active-heading 状态，可以使用 `createTocController({ page })`。

## RenderError

`RenderError` 是主题内部渲染失败时的默认 error boundary UI。内置的 `DocsApp`、`Root`、`Error`、`Docs`、`Layout`、`DocsShell`、`PageShell`、`Home` 和 `Article` 会用 `<svelte:boundary>` 捕获局部渲染错误，并渲染这个组件，而不是让整个路由崩掉。

| Prop | 说明 |
| --- | --- |
| `error` | boundary 捕获到的未知错误值。 |
| `reset` | 可选的 Svelte boundary reset 回调。 |
| `title`、`message`、`label` | 当前失败区域的用户可见文案。 |
| `variant` | `layout`、`article`、`content`、`navigation`、`tools`、`section` 或自定义字符串。 |
| `page` | 可用时传入当前页面。 |
| `context` | 可选，`SvedocsThemeContext`。 |
| `tree` | 可选导航树，用于生成 docs-home 操作。 |

当主题需要自定义恢复操作、日志、遥测或文案时，可以替换 `RenderError`。建议保持错误展示局部且克制：文章失败时仍然保留 header/sidebar，sidebar/ToC 失败时不要挡住文章正文。

## Search

`Search` 渲染搜索入口和弹窗。行为由 `createSearchController` 提供。

| Prop | 说明 |
| --- | --- |
| `records` | 初始本地搜索记录。 |
| `loadRecords` | 延迟记录加载器。 |
| `scope` | locale/kind 过滤条件。 |
| `provider` | `local`、`local-json` 或托管搜索 provider id。 |
| `endpoint` | 搜索路由，默认 `/api/search`。 |
| `buildMode` | `edge`、`static`、`spa` 或自定义字符串。 |
| `controller` | 可选，共享 `SvedocsSearchController`。 |

```svelte
<script lang="ts">
  import { createSearchController } from 'svedocs/theme/headless';
  import type { SvedocsSearchProps } from 'svedocs/theme/types';

  export let records: SvedocsSearchProps['records'] = [];
  export let loadRecords: SvedocsSearchProps['loadRecords'];
  export let scope: SvedocsSearchProps['scope'] = {};

  const search = createSearchController({ records, loadRecords, scope });
</script>

<button type="button" on:click={search.show}>搜索</button>
```

默认搜索还会监听 `window` 事件 `svedocs:open-search`。

## AskAi

`AskAi` 渲染 Ask AI 面板。行为由 `createAskAiController` 提供。

| Prop | 说明 |
| --- | --- |
| `config` | 必填，解析后的配置；`config.ai.enabled` 控制是否可用。 |
| `records` | 用于 fallback answer 的初始本地搜索记录。 |
| `loadRecords` | 延迟记录加载器。 |
| `scope` | locale/kind 过滤条件。 |
| `endpoint` | Ask 路由，默认 `/api/ask`。 |
| `buildMode` | 运行模式；非 edge 构建使用本地 fallback 行为。 |
| `controller` | 可选，共享 `SvedocsAskAiController`。 |

```svelte
<script lang="ts">
  import { createAskAiController } from 'svedocs/theme/headless';
  import type { SvedocsAskAiProps } from 'svedocs/theme/types';

  export let config: SvedocsAskAiProps['config'];
  const ask = createAskAiController({ config });
</script>

<button type="button" on:click={ask.show}>{config.ai.label}</button>
```

默认面板支持 JSON 响应和 `text/event-stream` 增量输出，也会监听 `window` 事件 `svedocs:open-ai`。

## Footer

`Footer` 根据 `config.theme.footer` 渲染全局 footer 文案和链接。

| Prop | 说明 |
| --- | --- |
| `context` | 必填，`SvedocsThemeContext`。 |

默认 footer 在文档文章页隐藏。自定义 footer 可以读取 `context.isDocsPage` 和 `context.surface` 来决定自己的显示规则。

## ThemeToggle

`ThemeToggle` 读写 `document.documentElement.dataset.theme`，更新 `color-scheme`，并把用户选择写入 `localStorage`。

| Prop | 说明 |
| --- | --- |
| `defaultMode` | `light`、`dark` 或 `system`，默认 `system`。 |

自定义切换器可以使用 `createThemeModeController(defaultMode)`。

## PageTools

`PageTools` 渲染文章页浮动工具：Ask AI 和回到顶部。

| Prop | 说明 |
| --- | --- |
| `config` | 必填，解析后的配置。 |
| `controller` | 可选，`SvedocsPageToolsController`。 |

如果想复用滚动状态和 `svedocs:open-ai` 事件，但不用默认浮动工具条，可以使用 `createPageToolsController(config)`。

## Headless helpers

| Helper | 用途 |
| --- | --- |
| `createThemeContext(input)` | 为自定义 root/layout 创建共享上下文。 |
| `createSearchController(options)` | 查询状态、本地/远程搜索、active result 和延迟记录加载。 |
| `createAskAiController(options)` | 面板状态、消息、JSON/SSE 请求和本地 fallback answer。 |
| `createTocController({ page })` | 当前标题和指示器位置。 |
| `createThemeModeController(defaultMode)` | 明暗模式状态、持久化和系统模式同步。 |
| `createMobileNavController()` | 移动菜单开关和 Escape 处理。 |
| `createPageToolsController(config)` | 浮动工具显示状态、Ask AI 触发和回到顶部。 |
| `copyTextToClipboard(source)` | 原始剪贴板 helper。 |
| `copyCodeToClipboard(button, source, copiedLabel?, idleLabel?)` | 默认代码复制按钮状态 helper。 |

## 样式契约

默认组件使用 `sd-*` class 和 `data-theme-component` 属性。自定义组件不需要复用这些 class。Markdown 和 code 输出仍会保留结构性的 `sd-*` class，所以自定义主题可以不使用默认 `styles.css`，但仍然能稳定地给 prose 写样式。

CSS 选择：

| Import | 内容 |
| --- | --- |
| `svedocs/theme/styles.css` | 完整默认主题。 |
| `svedocs/theme/base.css` | 最小 reset、无障碍 helper 和 prose/code 结构。 |
| 不导入主题 CSS | 由应用或主题包完全接管样式。 |
