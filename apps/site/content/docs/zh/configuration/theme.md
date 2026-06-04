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
      { label: 'GitHub', href: 'https://github.com/svedocs/svedocs', external: true }
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

`palette.accent` 可以是内置 token，例如 `emerald`、`teal`、`sky`、`indigo`、`rose` 或 `amber`。它也可以是任意 CSS 颜色值，例如 `#0ea5e9`、`hsl(221 83% 53%)` 或 `oklch(62% 0.18 250)`。默认主题会保持克制、适合阅读的视觉基调。

`home.visual` 可以继续使用内置 pixel 模块，也可以指向项目图片：`{ type: 'image', src: '/hero.png', alt: 'Preview' }`。

## 主题插槽

`DocsApp` 提供命名插槽，用来替换默认视觉层，同时保留内建路由外壳、metadata、header、footer、搜索、Ask AI 和文档导航。

```svelte title="src/routes/+page.svelte"
<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import components from 'virtual:svedocs/components';
  import layouts from 'virtual:svedocs/layouts';
  import loadSearch from 'virtual:svedocs/search-loader';

  export let data;
</script>

<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  {components}
  {layouts}
  {loadSearch}
>
  <div slot="background" class="brand-background"></div>
</DocsApp>
```

`background` 插槽会替换首页、普通单页和文档文章中的内置格子背景。它作为 `aria-hidden` 装饰层渲染，并禁用 pointer events。

首页还提供更细粒度的插槽：

```svelte title="src/routes/+page.svelte"
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  {components}
  {layouts}
  {loadSearch}
>
  <div slot="home-hero-visual" class="product-orbit" aria-hidden="true"></div>

  <section slot="home-features" let:cards class="feature-strip">
    {#each cards as card}
      <a href={card.href}>{card.title}</a>
    {/each}
  </section>
</DocsApp>
```

用 `home-hero-visual` 替换 pixel hero 特效或配置的 hero 图片；用 `home-features` 替换默认 feature blocks。`home-features` 会收到生成后的 `cards` 数组，方便自定义块复用同一组文档链接。

如果要替换整个 landing 内容，但保留 svedocs header 和 footer，可以使用 `landing`：

```svelte title="src/routes/+page.svelte"
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  {components}
  {layouts}
  {loadSearch}
>
  <section slot="landing" let:page class="custom-landing">
    <h1>{page.title}</h1>
    <p>{page.description}</p>
  </section>
</DocsApp>
```

`landing` 插槽外层仍由主题提供 `main#content`，所以跳过链接和页面语义会保留下来。

文档文章也提供 `doc-header`，适合只替换标题和面包屑区域：

```svelte
<DocsApp
  page={data.page}
  pages={data.pages}
  tree={data.tree}
  search={data.search}
  config={data.config}
  {components}
  {layouts}
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

## 交互能力

默认主题包括：

- 带键盘焦点管理的搜索弹窗。
- 支持 JSON 和 event-stream 的 Ask AI 面板。
- 文档、搜索、Ask AI 入口工具栏。
- 可折叠的递归侧栏和 locale 作用域树。
- 移动端菜单状态和过渡。
- 基于当前标题的 ToC 高亮。
- 带复制按钮的代码块工具条。
- 兼容 `prefers-reduced-motion` 的过渡。

## 单页

`content/pages` 下的内容默认用内置单页模板渲染。首页使用 `layout: home`，普通单页使用 `layout: page`，也可以使用注册过的自定义布局名。

```md
---
title: Changelog
description: Product updates rendered with the single-page template.
---

# Changelog
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

布局组件会收到与默认页面相同的 page data，所以自定义单页仍然可以使用 manifest、搜索记录、SEO 元数据和框架外壳。
