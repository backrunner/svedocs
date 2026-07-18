---
title: Theme
description: Customize the Tailwind CSS v4 default theme, color tokens, dark mode, navigation, and homepage layout.
order: 2
---

# Theme

The default theme ships inside the `svedocs` package. It uses Tailwind CSS v4 and framework CSS variables, so there is no separate theme package to install.

## Styles

Import the theme stylesheet from the SvelteKit root layout:

```svelte title="src/routes/+layout.svelte"
<script>
  import 'svedocs/theme/styles.css';
</script>

<slot />
```

The stylesheet defines `--sd-*` tokens and uses `data-theme` for light and dark mode.

## Form controls

The theme also exports basic form components for custom layouts, embedded tools, and interactive docs pages. They keep native Svelte ergonomics such as `bind:value`, forwarded DOM events, and standard form attributes.

```svelte
<script lang="ts">
  import { Button, Checkbox, FormField, Input, Select, Textarea } from 'svedocs/theme';

  let email = '';
  let role = 'reader';
  let note = '';
  let updates = true;
</script>

<FormField label="Email" for="email" description="Used only for workspace notifications.">
  <Input id="email" type="email" bind:value={email} placeholder="you@example.com" />
</FormField>

<FormField label="Role" for="role">
  <Select id="role" bind:value={role}>
    <option value="reader">Reader</option>
    <option value="editor">Editor</option>
  </Select>
</FormField>

<FormField label="Notes" for="note">
  <Textarea id="note" bind:value={note} rows="4" />
</FormField>

<Checkbox bind:checked={updates} label="Send release updates" />

<Button variant="primary" type="submit">Save preferences</Button>
```

Available controls are `FormField`, `Input`, `Textarea`, `Select`, `Checkbox`, and `Button`. `Input`, `Textarea`, `Select`, `Checkbox`, and `Button` accept `density="sm" | "md" | "lg"`. `Button` accepts `variant="default" | "primary" | "ghost" | "danger"`.

## Palette

For a quick brand color swap, set only `theme.palette.accent`:

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
      { label: 'Docs', href: '/docs' },
      { label: 'Configuration', href: '/docs/configuration' },
      { label: 'API', href: '/docs/reference/api' }
    ],
    social: [
      { label: 'GitHub', href: 'https://github.com/svedocs/svedocs', external: true }
    ],
    footer: {
      text: 'MIT licensed.',
      links: [{ label: 'Cloudflare', href: '/docs/integrations/cloudflare' }]
    },
    home: {
      kicker: 'Edge-first Svelte docs',
      primaryAction: { label: 'Read docs', href: '/docs' },
      secondaryAction: { label: 'Configure', href: '/docs/configuration' },
      visual: { type: 'pixel' }
    }
  }
});
```

`palette.accent` accepts a built-in color name such as `emerald`, `teal`, `sky`, `indigo`, `rose`, or `amber`. You can also pass any CSS color value, including `#0ea5e9`, `hsl(221 83% 53%)`, or `oklch(62% 0.18 250)`.

`home.visual` can stay as the built-in pixel module or point at a project image with `{ type: 'image', src: '/hero.png', alt: 'Preview' }`.

The default root layout runs a synchronous theme initializer before theme CSS is applied, using the saved `svedocs-theme` preference or the system color scheme. Full custom layouts and full theme component replacements receive the same initializer from `DocsApp`. When rendering a custom application shell without `DocsApp` or `RootLayout`, render `ThemeInit` from `svedocs/theme` once in that shell.

Set `theme.defaultMode` to `light` or `dark` to lock the site to one color mode. Fixed modes apply only the selected design tokens, omit the theme toggle, skip the theme bootstrap script, and compile code blocks with the selected code theme. The default `system` mode keeps the toggle, saved preference, and system color scheme synchronization.

## Theme slots

`DocsApp` exposes named slots for changing parts of the page without rebuilding its routing, metadata, header, footer, search, Ask AI, or docs navigation.

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

The `background` slot replaces the built-in grid layer on the homepage, single pages, and documentation articles. It is rendered as an `aria-hidden` decorative layer with pointer events disabled.

Homepage-specific slots let you replace smaller regions:

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
  {components}
  {layouts}
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

Use `home-hero-visual` to replace the pixel hero effect or configured hero image. Use `home-features` to replace the default feature blocks. The slot receives the generated `cards` array so custom blocks can reuse the same documentation links. It also receives `context`, so custom UI can call `context.t(...)`, read `context.localeCode`, or use `context.messages`.

To replace the entire landing content while preserving the svedocs header and footer, use `landing`:

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
  <section slot="landing" let:page let:context class="custom-landing">
    <h1>{page.title}</h1>
    <p>{page.description}</p>
    <a href={resolveLocalizedHref('/docs', context)}>
      {context.t('home.primaryAction')}
    </a>
  </section>
</DocsApp>
```

The theme still provides the `main#content` wrapper for the `landing` slot, so the skip link and page semantics remain intact.

In custom landing pages and replacement components, use `context.t('message.key')` instead of hard-coding interface text. Add built-in or project-specific keys to `i18n.messages`; custom components receive the catalog for the active locale. Use `context.localeCode` for filtering data and `context.languageTag` for HTML attributes or locale-sensitive formatting. See [Internationalization](/docs/configuration/i18n) for the complete setup.

Documentation articles also expose `doc-header` when you only need to replace the title and breadcrumb area:

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

## Theme development

Choose the level of customization that matches the change:

| Layer | Use it when |
| --- | --- |
| Theme tokens | You like the default components and only need brand color, fonts, radius, navigation, homepage, or code settings. |
| Component replacement | You want to keep the svedocs route shell and replace one or more visual components. |
| Headless composition | You want to own the markup and CSS while reusing search, Ask AI, ToC, theme mode, mobile nav, and copy behavior. |

The default CSS is optional:

| Import | Result |
| --- | --- |
| `svedocs/theme/styles.css` | Full bundled visual theme. |
| `svedocs/theme/base.css` | Minimal reset, accessibility helpers, and prose/code structure. |
| No theme CSS | Your app or theme package owns all styles. |

Keep configuration values in `svedocs.config.ts`. Put Svelte component imports in the Vite plugin because component paths are build-time imports and should not be serialized into the content config.

Register replacement components in the Vite plugin:

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

Generated route files import `virtual:svedocs/theme-components` and pass it into `DocsApp`, so overrides apply without changing every route:

```svelte title="src/routes/+page.svelte"
<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import components from 'virtual:svedocs/components';
  import layouts from 'virtual:svedocs/layouts';
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
  {components}
  {layouts}
  {themeComponents}
  {loadSearch}
/>
```

Replacement components receive typed props from `svedocs/theme/types`. The component map supports `Root`, `Layout`, `Docs`, `DocsShell`, `Page`, `PageShell`, `Home`, `Error`, `Header`, `Navbar`, `Brand`, `TopNav`, `MobileNav`, `SocialNav`, `Sidebar`, `Article`, `Toc`, `Search`, `AskAi`, `Footer`, `FooterLinks`, `ThemeToggle`, `PageTools`, and `RenderError`. See [Components](/docs/reference/theme-components) for the full per-component props.

```svelte title="src/lib/theme/Navbar.svelte"
<script lang="ts">
  import type { SvedocsNavbarProps } from 'svedocs/theme/types';

  export let context: SvedocsNavbarProps['context'];
</script>

<header class="brand-nav">
  <a href={context.config.theme.brand.href}>{context.config.theme.brand.label}</a>
</header>
```

Use `svedocs/theme/headless` when you want the framework behavior without the default UI. It exports controllers for theme context, search, Ask AI, ToC tracking, theme mode, mobile nav, page tools, and code-copy behavior.

```svelte title="src/lib/theme/Search.svelte"
<script lang="ts">
  import { createSearchController } from 'svedocs/theme/headless';
  import type { SvedocsSearchProps } from 'svedocs/theme/types';

  export let records: SvedocsSearchProps['records'] = [];
  const search = createSearchController({ records });
</script>

<button type="button" on:click={search.show}>Search</button>
```

When writing replacement components:

- Keep normal landmarks such as `header`, `nav`, `main`, `article`, `aside`, and `footer`.
- Render `content` for compiled `.svx` / `.mdx` pages and fall back to `page.html` when no content component exists.
- Pass `themeComponents` to nested default components when you still compose part of the bundled theme.
- If you replace `Root`, `Docs`, `Page`, `Home`, or `Error`, keep passing `pages`, `tree`, `search`, `config`, and `loadSearch` into the theme context or nested default components so sidebar highlighting, mobile navigation, search, and Ask AI keep working.
- Replace `Layout`, `DocsShell`, or `PageShell` for layout geometry changes before replacing the larger `Root`, `Docs`, `Page`, or `Error` components.
- Use `loadSearch` for large sites instead of forcing all search records into the first route payload.
- Trigger the default search and Ask AI panels with `svedocs:open-search` and `svedocs:open-ai` events when you build custom command buttons.

Markdown output still includes stable `sd-*` structure classes for prose, headings, and code blocks so default styles and custom styles can target the same markup. Set `theme.code.copyButton: false` if your theme renders its own copy control.

Generated templates include `src/routes/+error.svelte`. Register `theme.components.Error` to replace full-route error pages, and register `theme.components.RenderError` to replace local error-boundary UI inside article content, layout regions, navigation, and tools. The generated error route catches failures in a custom `Error` component and falls back to the bundled `ErrorPage`.

Theme packages can be ordinary Svelte libraries. Export Svelte components from the package, document the expected `svedocs` peer version, and have users register the package component paths in `svedocs({ theme: { components } })`.

## Interaction

Built-in theme behavior includes:

- Search dialog with keyboard focus management.
- Ask AI panel with JSON and event-stream responses.
- Command palette for docs, search, and Ask AI entry points.
- Recursive sidebar with collapsed groups and locale-scoped trees.
- Mobile menu state with transition.
- ToC highlighting based on the active heading.
- Code block toolbar with copy support.
- `prefers-reduced-motion` compatible transitions.

## Single pages

Content under `content/pages` renders through the built-in single-page template by default. Use `layout: home` for the homepage, `layout: page` for the built-in page template, or a registered custom layout name for project-specific pages.

```md
---
title: Changelog
description: Product updates rendered with the single-page template.
---

# Changelog
```

## Custom layouts

Register named layouts in the Vite plugin:

```ts title="vite.config.ts"
svedocs({
  layouts: {
    feature: '$lib/FeatureLayout.svelte'
  }
});
```

Then select a layout in frontmatter:

```md
---
title: Feature Page
layout: feature
---
```

Layouts receive the same data as default pages, so a custom single page can still use the page list, search records, SEO metadata, and surrounding site UI.
