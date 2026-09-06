---
title: 主题
description: 自定义 Tailwind CSS v4 默认主题、颜色变量、明暗模式、导航和首页布局。
order: 2
---

# 主题

默认主题内置在 `svedocs` 包里。它使用 Tailwind CSS v4 和框架 CSS 变量，不需要安装额外主题包。

## 样式

在 SvelteKit 根布局里导入主题样式：

```svelte title="src/routes/+layout.svelte"
<script>
  import 'svedocs/theme/styles.css';
</script>

<slot />
```

这份样式定义了 `--sd-*` 变量，并通过 `data-theme` 切换明暗模式。

## 在自定义布局中使用优化图片

自定义 landing 页面或主题组件需要本地图片时，可以使用导出的 `SvedocsImage` 组件。Vite 插件会在构建阶段处理它的静态 `src`，使用与 Markdown 内容相同的 `images` 配置；运行时组件仍然只是一个普通的 `<img>`。

```svelte title="src/lib/Hero.svelte"
<script lang="ts">
  import { SvedocsImage } from 'svedocs/theme';
</script>

<SvedocsImage
  src="/images/hero.png"
  width={640}
  height={360}
  alt="产品预览"
  sizes="(max-width: 768px) 100vw, 640px"
  class="hero-image"
/>
```

`width` 同时作为图片的渲染属性和优先优化宽度。如果实际宽度由 CSS 控制，或两者需要不同，可以使用 `displayWidth`。组件支持常见的图片属性；远程 URL、`data:`、`blob:`、动态表达式和动图格式会保持不变。

图片源必须是静态本地路径，例如 `/images/hero.png`，或相对于 Svelte 文件的路径。生成文件会写入 `images.outputDir` 指定的目录，并使用与 Markdown 图片相同的内容哈希文件名。为单张图片添加 `class="no-compress"` 或 `data-svedocs-no-compress` 可以跳过优化。

在 MDX/SVX 中也可以使用该组件，但需要先导入：

```mdx
import { SvedocsImage } from 'svedocs/theme';

<SvedocsImage src="/images/hero.png" displayWidth={960} alt="产品预览" />
```

如果图片 URL 是动态生成的，请直接使用普通 `<img>` 并自行提供最终 URL；构建阶段无法安全地处理源文件中不存在的图片。

## 表单控件

主题也导出了一组基础表单组件，适合自定义布局、嵌入式工具和交互式文档页使用。它们保留 Svelte 的原生使用习惯，例如 `bind:value`、DOM 事件转发和标准表单属性。

```svelte
<script lang="ts">
  import { Button, Checkbox, FormField, Input, Select, Textarea } from 'svedocs/theme';

  let email = '';
  let role = 'reader';
  let note = '';
  let updates = true;
</script>

<FormField label="邮箱" for="email" description="仅用于工作区通知。">
  <Input id="email" type="email" bind:value={email} placeholder="you@example.com" />
</FormField>

<FormField label="角色" for="role">
  <Select id="role" bind:value={role}>
    <option value="reader">读者</option>
    <option value="editor">编辑者</option>
  </Select>
</FormField>

<FormField label="备注" for="note">
  <Textarea id="note" bind:value={note} rows="4" />
</FormField>

<Checkbox bind:checked={updates} label="接收版本更新" />

<Button variant="primary" type="submit">保存偏好</Button>
```

可用控件包括 `FormField`、`Input`、`Textarea`、`Select`、`Checkbox` 和 `Button`。`Input`、`Textarea`、`Select`、`Checkbox`、`Button` 支持 `density="sm" | "md" | "lg"`；`Button` 支持 `variant="default" | "primary" | "ghost" | "danger"`。

## 调色板

只想快速换品牌主题色时，只配置 `theme.palette.accent` 即可：

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  theme: {
    palette: {
      accent: 'sky'
    }
  }
});
```

```ts title="svedocs.config.ts"
import { defineConfig } from 'svedocs/config';

export default defineConfig({
  theme: {
    defaultMode: 'system',
    palette: {
      accent: 'emerald',
      neutral: 'zinc'
    },
    fonts: {
      sans: '"IBM Plex Sans", "Avenir Next", sans-serif',
      mono: '"JetBrains Mono", "SFMono-Regular", monospace',
      display: '"IBM Plex Sans", "Avenir Next", sans-serif'
    },
    radius: '2px',
    codeTheme: {
      light: 'light-plus',
      dark: 'dark-plus'
    },
    code: {
      copyButton: true
    },
    brand: {
      label: 'svedocs',
      href: '/',
      mark: 'pixel'
    },
    nav: [
      { label: '文档', href: '/docs/zh' },
      { label: '配置', href: '/docs/zh/configuration' },
      { label: '参考', href: '/docs/zh/reference/api' }
    ],
    social: [
      { label: 'GitHub', href: 'https://github.com/backrunner/svedocs', external: true }
    ],
    footer: {
      text: 'MIT licensed.',
      links: [{ label: 'Cloudflare', href: '/docs/zh/integrations/cloudflare' }]
    },
    home: {
      kicker: '边缘优先的 Svelte 文档站',
      primaryAction: { label: '阅读文档', href: '/docs/zh' },
      secondaryAction: { label: '去配置', href: '/docs/zh/configuration' },
      visual: { type: 'pixel' }
    }
  }
});
```

`palette.accent` 可以使用 `emerald`、`teal`、`sky`、`indigo`、`rose` 或 `amber` 等内置颜色名，也可以直接填写 `#0ea5e9`、`hsl(221 83% 53%)`、`oklch(62% 0.18 250)` 等任意 CSS 颜色值。

`home.visual` 可以继续使用内置的像素效果，也可以指向项目中的图片：`{ type: 'image', src: '/hero.png', alt: 'Preview' }`。

默认根布局会在主题 CSS 生效前同步执行主题初始化器，优先读取已保存的 `svedocs-theme`，否则跟随系统配色。完整自定义布局和整页主题组件替换也会由 `DocsApp` 注入同一逻辑。如果应用外壳完全不使用 `DocsApp` 或 `RootLayout`，请在外壳中渲染一次 `svedocs/theme` 导出的 `ThemeInit`。

将 `theme.defaultMode` 设置为 `light` 或 `dark` 可以锁定站点的配色模式。固定模式只应用所选的 design token，不渲染主题切换按钮，不注入主题初始化脚本，并使用所选的代码主题生成代码块。默认的 `system` 模式会保留切换按钮、已保存偏好和系统配色同步。

这些示例使用生成模板中的通用 `+page.ts` 加载器提供的 `data.content` 和 `data.layout`。旧项目的迁移方法、自定义正文和命名布局示例见[自定义页面](/docs/zh/configuration/pages)。

## 主题插槽

`DocsApp` 提供命名插槽，可以只替换页面中的某个区域，不必重新实现路由、元数据、页头、页脚、搜索、Ask AI 和文档导航。

```svelte title="src/routes/+page.svelte"
<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import loadSearch from 'virtual:svedocs/search-loader';

  export let data;
</script>

<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  content={data.content}
  layout={data.layout}
  {loadSearch}
>
  <div slot="background" class="brand-background"></div>
</DocsApp>
```

`background` 插槽会替换首页、普通单页和文档文章中的内置格子背景。它会作为 `aria-hidden` 的装饰层渲染，并禁用指针事件。

首页还提供更细粒度的插槽：

```svelte title="src/routes/+page.svelte"
<script lang="ts">
  import { resolveLocalizedHref } from 'svedocs/theme/headless';
</script>

<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  content={data.content}
  layout={data.layout}
  {loadSearch}
>
  <div slot="home-hero-visual" class="product-orbit" aria-hidden="true"></div>

  <section slot="home-features" let:cards let:context class="feature-strip">
    <h2>{context.t('home.features')}</h2>
    {#each cards as card}
      <a href={card.href}>{card.title}</a>
    {/each}
  </section>
</DocsApp>
```

用 `home-hero-visual` 替换首页主视觉中的像素效果或配置图片，用 `home-features` 替换默认的功能介绍区。`home-features` 会收到生成后的 `cards` 数组，方便自定义内容复用同一组文档链接；它也会收到 `context`，可以调用 `context.t(...)`、读取 `context.localeCode` 或使用 `context.messages`。

如果要替换首页的全部内容，但保留 svedocs 的页头和页脚，可以使用 `landing`：

```svelte title="src/routes/+page.svelte"
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  content={data.content}
  layout={data.layout}
  {loadSearch}
>
  <section slot="landing" let:page let:context class="custom-landing">
    <h1>{page.title}</h1>
    <p>{page.description}</p>
    <a href={resolveLocalizedHref('/docs', context)}>
      {context.t('home.primaryAction')}
    </a>
  </section>
</DocsApp>
```

`landing` 插槽外层仍由主题提供 `main#content`，因此跳转到正文的无障碍链接和页面语义不会丢失。

在自定义首页和替换组件中，使用 `context.t('message.key')` 读取界面文案，不要把文字写死。可以在 `i18n.messages` 中添加内建或项目自定义的键，自定义组件会收到当前语言的文案。过滤数据时使用 `context.localeCode`，设置 HTML 属性或按语言格式化数据时使用 `context.languageTag`。完整配置见[多语言](/docs/zh/configuration/i18n)。

文档文章也提供 `doc-header`，适合只替换标题和面包屑区域：

```svelte
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  content={data.content}
  layout={data.layout}
  {loadSearch}
>
  <header slot="doc-header" let:page let:breadcrumbs class="article-hero">
    <nav>
      {#each breadcrumbs as item}
        <a href={item.path}>{item.label}</a>
      {/each}
    </nav>
    <h1>{page.title}</h1>
  </header>
</DocsApp>
```

## 主题开发

根据改动范围选择合适的定制方式：

| 层级 | 适合场景 |
| --- | --- |
| 主题变量 | 保留默认组件，只调整品牌色、字体、圆角、导航、首页或代码块设置。 |
| 组件替换 | 你想保留 svedocs 路由壳层，但替换一个或多个视觉组件。 |
| 无样式组合 | 完全接管 HTML 结构和 CSS，同时复用搜索、Ask AI、目录高亮、明暗模式、移动导航和复制行为。 |

默认 CSS 是可选的：

| 导入方式 | 结果 |
| --- | --- |
| `svedocs/theme/styles.css` | 完整内置视觉主题。 |
| `svedocs/theme/base.css` | 最小样式重置、无障碍基础样式，以及正文和代码结构。 |
| 不导入主题 CSS | 应用或主题包完全接管所有样式。 |

普通配置继续放在 `svedocs.config.ts`。Svelte 组件路径则放在 Vite 插件中，因为它们需要在构建时导入，不应被序列化进内容配置。

在 Vite 插件里注册替换组件：

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

生成的路由会导入 `virtual:svedocs/theme-components` 并传给 `DocsApp`，所以不用逐个页面手动接线：

```svelte title="src/routes/+page.svelte"
<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import themeComponents from 'virtual:svedocs/theme-components';
  import loadSearch from 'virtual:svedocs/search-loader';

  export let data;
</script>

<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  content={data.content}
  layout={data.layout}
  {themeComponents}
  {loadSearch}
/>
```

替换组件可以从 `svedocs/theme/types` 获取属性类型。可替换组件包括 `Root`、`Layout`、`Docs`、`DocsShell`、`Page`、`PageShell`、`Home`、`Error`、`Header`、`Navbar`、`Brand`、`TopNav`、`MobileNav`、`SocialNav`、`Sidebar`、`Article`、`Toc`、`Search`、`AskAi`、`Footer`、`FooterLinks`、`ThemeToggle`、`PageTools` 和 `RenderError`。各组件的完整属性见[组件](/docs/zh/reference/theme-components)。

```svelte title="src/lib/theme/Navbar.svelte"
<script lang="ts">
  import type { SvedocsNavbarProps } from 'svedocs/theme/types';

  export let context: SvedocsNavbarProps['context'];
</script>

<header class="brand-nav">
  <a href={context.config.theme.brand.href}>{context.config.theme.brand.label}</a>
</header>
```

如果只想复用交互逻辑、不使用默认界面，可以从 `svedocs/theme/headless` 引入控制器。其中包含主题上下文、搜索、Ask AI、目录高亮、明暗模式、移动导航、页面工具和代码复制等逻辑。

```svelte title="src/lib/theme/Search.svelte"
<script lang="ts">
  import { createSearchController } from 'svedocs/theme/headless';
  import type { SvedocsSearchProps } from 'svedocs/theme/types';

  export let records: SvedocsSearchProps['records'] = [];
  const search = createSearchController({ records });
</script>

<button type="button" on:click={search.show}>搜索</button>
```

编写替换组件时：

- 保留 `header`、`nav`、`main`、`article`、`aside`、`footer` 等标准语义区域。
- 对 `.svx` / `.mdx` 页面渲染 `content`，没有内容组件时回退到 `page.html`。
- 仍然组合部分默认组件时，把 `themeComponents` 继续传给嵌套组件。
- 如果替换 `Root`、`Docs`、`Page`、`Home` 或 `Error`，继续把 `pages`、`tree`、`search`、`config` 和 `loadSearch` 传入主题上下文或嵌套的默认组件，这样侧栏高亮、移动导航、搜索和 Ask AI 才能保持联动。
- 只调整布局几何结构时，优先替换 `Layout`、`DocsShell` 或 `PageShell`，再考虑替换更大的 `Root`、`Docs`、`Page` 或 `Error`。
- 大型站点优先使用 `loadSearch`，避免把所有搜索记录都放进首屏路由数据。
- 自定义命令按钮可以用 `svedocs:open-search` 和 `svedocs:open-ai` 事件打开默认搜索和 Ask AI 面板。

Markdown 输出会保留稳定的 `sd-*` 结构类名，默认主题和自定义主题都可以针对同一套正文、标题和代码结构编写样式。如果主题自己渲染复制按钮，可以设置 `theme.code.copyButton: false`。

生成模板已经包含 `src/routes/+error.svelte`。注册 `theme.components.Error` 可以替换完整路由的错误页；注册 `theme.components.RenderError` 可以替换文章内容、布局区域、导航和工具中的局部错误提示。生成的错误路由会捕获自定义 `Error` 组件自身的异常，并改用内置 `ErrorPage`。

主题包可以是普通的 Svelte 库。从包中导出组件，声明兼容的 `svedocs` peer dependency 版本，再让使用者在 `svedocs({ theme: { components } })` 中注册对应的组件路径即可。

## 交互能力

默认主题包括：

- 带键盘焦点管理的搜索弹窗。
- 支持 JSON 和事件流响应的 Ask AI 面板。
- 文档、搜索、Ask AI 入口工具栏。
- 可折叠的递归侧栏，以及按语言过滤的导航树。
- 移动端菜单状态和过渡。
- 根据当前位置高亮目录标题。
- 带复制按钮的代码块工具条。
- 兼容 `prefers-reduced-motion` 的过渡。

## 单页

`content/pages` 下的内容默认用内置单页模板渲染。首页使用 `layout: home`，普通单页使用 `layout: page`，也可以使用注册过的自定义布局名。

```md
---
title: 更新日志
description: 使用单页模板展示产品更新。
---

# 更新日志
```

## 自定义布局

在 Vite 插件里注册命名布局：

```ts title="vite.config.ts"
svedocs({
  layouts: {
    feature: '$lib/FeatureLayout.svelte'
  }
});
```

然后在 frontmatter 里选择它：

```md
---
title: Feature Page
layout: feature
---
```

布局组件会收到与默认页面相同的数据，因此自定义单页仍然可以使用页面列表、搜索记录、SEO 元数据和站点外壳。
