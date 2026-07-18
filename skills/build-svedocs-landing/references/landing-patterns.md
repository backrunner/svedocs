# Landing patterns

- [How home routing works](#how-home-routing-works)
- [Configure or replace regions](#level-1-configure-the-built-in-home)
- [Replace landing content](#level-3-replace-landing-content)
- [Replace Home](#level-4-replace-home)
- [Content and localization](#content-and-localization)
- [QA checklist](#qa-checklist)

## How home routing works

`DocsApp` selects Home when the page has `scopePath === '/'` or frontmatter `layout: home`. The root page normally comes from `content/pages/index.md`.

The generated root route renders `/`. Localized home routes such as `/zh` are commonly resolved by `src/routes/[...path]/+page.svelte`. Therefore:

- a slot added only to `src/routes/+page.svelte` affects only `/`;
- use a shared wrapper from both route files when all routes need identical slots;
- use a registered `Home` replacement when the route files do not share slot markup or the design needs the full Home contract.

Prefer a shared `landing` slot when both route files already compose the same renderer: it preserves more built-in behavior with a smaller contract. Prefer `Home` registration when avoiding duplicated route markup is more important or the replacement must control the full home composition.

## Level 1: Configure the built-in home

```ts
theme: {
  home: {
    kicker: 'Developer platform',
    primaryAction: { label: 'Read docs', href: '/docs' },
    secondaryAction: { label: 'View API', href: '/docs/reference/api' },
    visual: {
      type: 'image',
      src: '/product.png',
      alt: 'Product workspace'
    }
  }
}
```

Add `labelKey`, `kickerKey`, or `altKey` for localized shell copy.

## Level 2: Replace a region

```svelte
<DocsApp {...props}>
  <ProductPreview
    slot="home-hero-visual"
    let:page
    let:context
    title={page.title}
    locale={context.localeCode}
  />

  <section slot="home-features" let:cards let:context>
    <h2>{context.t('home.features')}</h2>
    {#each cards as card}
      <a href={card.href}>{card.title}</a>
    {/each}
  </section>
</DocsApp>
```

Reuse generated cards when their content and links fit the design.

## Level 3: Replace landing content

```svelte
<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import { resolveLocalizedHref } from 'svedocs/theme/headless';
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
>
  <section slot="landing" let:page let:context>
    <h1>{page.title}</h1>
    <p>{page.description}</p>
    <a href={resolveLocalizedHref('/docs', context)}>
      {context.t('home.primaryAction')}
    </a>
  </section>
</DocsApp>
```

The slot already sits inside `main#content` and preserves the default Root header and footer. Do not add another `main`.

Omitting `content` is intentional for a design-only landing. When translated Markdown below the hero must remain visible, render the compiled `content` component and fall back to `page.html`.

## Level 4: Replace Home

Register the component path:

```ts
svedocs({
  config: svedocsConfig,
  theme: {
    components: {
      Home: '$lib/theme/Home.svelte'
    }
  }
});
```

Type props with `SvedocsHomeLayoutProps` from `svedocs/theme/types`. Build a theme context from `page`, `pages`, `tree`, `search`, `config`, and optional `loadSearch`. Compose `themeComponents.Root ?? RootLayout` with the same data so metadata, navbar, footer, search, mobile navigation, and nested overrides remain connected. Retain `main#content` and render authored `content` when the design requires it.

Do not render `ThemeInit` directly in the custom Home. `DocsApp` initializes registered Home replacements. If the replacement also composes `RootLayout` to retain metadata and the default shell, current output contains both framework-owned initializers; their script is idempotent and applies the same theme, `lang`, and `dir` state. Do not add a third initializer. Prefer a shared `landing` slot when retaining a single RootLayout-owned head bootstrap matters.

## Content and localization

Keep SEO text in frontmatter:

```md
---
title: Acme
description: Ship reliable APIs with Acme.
layout: home
---
```

Use message keys for UI text. Use content pages for longer localized prose. Locale directories use configured locale `path` values, which may differ from locale codes. Filter page lists by `context.localeCode` before deriving cards or counts. Resolve internal links with `resolveLocalizedHref` or `LocalizedLink`.

## QA checklist

- Home title, description, canonical, OG, and structured data match the active locale.
- Header, footer, search, Ask AI, and theme toggle still work.
- Primary actions resolve to localized destinations.
- Default and localized home routes use the intended structure.
- Images are sharp, correctly framed, and have meaningful alt text unless decorative.
- Desktop and mobile have stable dimensions without overlap or clipped text.
- Keyboard focus, reduced motion, and skip-to-content remain functional.
- Edge, static, and SPA builds retain the landing and all finite localized routes.
