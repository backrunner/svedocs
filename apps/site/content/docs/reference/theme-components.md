---
title: Components
description: Look up props, responsibilities, and headless controllers for replaceable svedocs theme components.
order: 4
---

# Components

The svedocs theme is split into replaceable Svelte components and reusable headless controllers. This page documents the contracts for the navbar, article layout, search dialog, Ask AI panel, table of contents, footer, and floating page tools.

## Import paths

```ts
import { DocsApp, Navbar, Article, SearchDialog } from 'svedocs/theme';
import { createSearchController, createAskAiController } from 'svedocs/theme/headless';
import type {
  SvedocsThemeComponentMap,
  SvedocsNavbarProps,
  SvedocsArticleProps
} from 'svedocs/theme/types';
```

`svedocs/theme` exports the default components and also re-exports the headless helpers and public types. Prefer `svedocs/theme/headless` and `svedocs/theme/types` in theme packages when you want small, explicit imports.

## Component map

Register build-time replacements in the Vite plugin:

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

Generated routes import `virtual:svedocs/theme-components` and pass the map to `DocsApp`. You can also pass a map manually:

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

The map type is:

| Key | Default component | Props type |
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

## Shared context

Most shell components receive `SvedocsThemeContext`.

| Field | Description |
| --- | --- |
| `config` | Resolved `svedocs.config.ts`. |
| `page` | Current page when one is available. |
| `pages` | Full page manifest. |
| `tree` | Navigation tree for the current docs scope. |
| `search` | Search records already loaded into the route. |
| `loadSearch` | Lazy search-record loader, usually from `virtual:svedocs/search-loader`. |
| `searchScope` | Runtime search filter derived from `search.scope` and the current locale. |
| `aiScope` | Runtime Ask AI filter derived from `ai.scope` and the current locale. |
| `surface` | `home` or `reading`. |
| `isDocsPage` | Whether the current page is a docs article. |
| `activeNavHref` | Normalized active top-nav href. |
| `locale` | Current resolved locale config, including `hreflang` and `dir` when configured. |
| `localeCode` | Stable locale code used by search, AI, and stored scopes. |
| `languageTag` | BCP 47 tag used by HTML and locale-sensitive formatting. |
| `messages` | Fully merged messages for the current locale. |
| `t` | Locale-aware translator with `{value}` interpolation. |

Create the same object in custom shells with `createThemeContext`.

## DocsApp

`DocsApp` is the complete route renderer. Use it when you want svedocs to connect routing, metadata, layouts, slots, and replacement components.

| Prop | Type | Notes |
| --- | --- | --- |
| `page` | `SvedocsPage` | Required current page. |
| `config` | `SvedocsResolvedConfig` | Required resolved config. |
| `pages` | `SvedocsPage[]` | Optional, defaults to `[]`. |
| `tree` | `SvedocsTreeItem[]` | Optional, defaults to `[]`. |
| `search` | `SvedocsSearchRecord[]` | Optional, defaults to `[]`. |
| `components` | `Record<string, Component>` | Compiled `.svx` / `.mdx` page components. |
| `layouts` | `Record<string, Component>` | Named single-page layouts. |
| `themeComponents` | `Partial<SvedocsThemeComponentMap>` | Component overrides. |
| `loadSearch` | `SvedocsRecordLoader` | Lazy search-record loader. |

Slots: `background`, `landing`, `home-hero-visual`, `home-features`, and `doc-header`.

## Root

`Root` handles document metadata, the theme initialization script, route hydration state, scrollbar visibility, and the shared background slot. Its default visual shell is `Layout`.

| Prop | Notes |
| --- | --- |
| `config` | Required resolved config. |
| `page`, `pages`, `tree`, `search`, `loadSearch` | Inputs used to create `SvedocsThemeContext`. |
| `mobileTree`, `mobileCurrentPath` | Mobile docs navigation data. |
| `hasBackgroundSlot` | Forces or disables rendering of the background slot. |
| `themeComponents` | Passed through to nested replaceable components. |

The default root renders `<slot />` as the page body and `<slot name="background" />` as a decorative layer.

## Layouts

`Docs`, `Page`, `Home`, and `Error` are the page-level layouts used by `DocsApp` and generated routes. Replace them when you want to keep framework routing, metadata, and content loading but provide a new page shell. `Error` renders SvelteKit error pages with the same themed root, header, footer, search, theme mode, and `noindex` metadata; generated templates include `src/routes/+error.svelte`.

| Component | Notes |
| --- | --- |
| `Docs` | Docs article shell with sidebar, article, and ToC. |
| `Page` | Standalone page shell. |
| `Home` | Home page shell and feature entry points. |
| `Error` | Receives `status`, `message`, `error`, `path`, config, manifest data, search, and `themeComponents`. |

`Docs`, `Page`, and `Home` receive the current `page`, `pages`, `tree`, `search`, `config`, `loadSearch`, page `content`, and `themeComponents` so replacement layouts can reuse the same navigation and runtime data as the bundled theme.

## Basic Layout Components

`Layout`, `DocsShell`, and `PageShell` are lower-level visual layout components. Replace them when your theme only needs a different outer frame or content geometry while preserving the default page-level behavior.

| Component | Notes |
| --- | --- |
| `Layout` | Site frame inside `Root`: skip link, header, background slot, default slot, Ask AI, page tools, and footer. |
| `DocsShell` | Documentation content geometry: sidebar, article region, and ToC. |
| `PageShell` | Standalone page body and error page body. Supports `variant="page"` and `variant="error"`. |

`Layout` receives `SvedocsLayoutShellProps`, including `context`, `themeStyle`, mobile-nav state, `themeComponents`, and mobile callbacks. If you replace it, keep rendering the default slot, the `background` slot when `hasBackgroundSlot` is true, and the header/footer or your own equivalents.

`DocsShell` receives `page`, `navigationTree`, `content`, `context`, `tocController`, `hasDocHeaderSlot`, and `themeComponents`. The default shell still delegates to replaceable `Sidebar`, `Article`, and `Toc`.

`PageShell` receives optional `page`, `variant`, `title`, `description`, `kicker`, `content`, `html`, `status`, `path`, and `actions`. The default `Page` and `Error` components both use it, so replacing `PageShell` updates normal standalone pages and the default error page together.

## Navbar

`Navbar` renders brand, primary navigation, search, locale/version switcher, social links, theme toggle, and mobile navigation. `Header` is an alias replacement point for `Navbar`, and the default navbar composes `Brand`, `TopNav`, `SocialNav`, `Search`, `ThemeToggle`, and `MobileNav`.

| Prop | Notes |
| --- | --- |
| `context` | Required `SvedocsThemeContext`. |
| `mobileTree`, `mobileCurrentPath` | Docs tree and current path for the mobile menu. |
| `mobileMenuId`, `mobileMenuOpen` | Accessibility state managed by `Root`. |
| `themeComponents` | Used by the default navbar to render custom `Search`, `ThemeToggle`, and `MobileNav`. |
| `onToggleMobileMenu`, `onCloseMobileMenu` | Callbacks from the mobile-nav controller. |

Minimum custom navbar:

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

`MobileNav` renders the docs navigation inside the responsive topbar menu.

| Prop | Notes |
| --- | --- |
| `items` | `SvedocsTreeItem[]`, defaults to `[]`. |
| `currentPath` | Route path used for active link state. |
| `themeComponents` | Allows the default mobile nav to reuse a custom `Sidebar`. |

Use it when mobile navigation differs from the desktop sidebar.

## Sidebar

`Sidebar` renders recursive docs navigation.

| Prop | Notes |
| --- | --- |
| `items` | `SvedocsTreeItem[]`, defaults to `[]`. |
| `currentPath` | Current route path. |
| `depth` | Nesting depth for recursive rendering. |

Custom sidebars should preserve normal links and `aria-current="page"` on the active item.

## Article

`Article` renders the documentation article header, prose body, edit link, last-updated metadata, and prev/next navigation.

| Prop | Notes |
| --- | --- |
| `page` | Required current page. |
| `content` | Compiled Svelte content component for `.svx` / `.mdx`; fallback is `page.html`. |
| `context` | Optional `SvedocsThemeContext`. |
| `hasDocHeaderSlot` | Forces or disables the `doc-header` slot branch. |
| `themeComponents` | Passed through so the default article can use a custom `RenderError`. |

The default article exposes a `doc-header` slot with `page` and `breadcrumbs`. If you replace the component, keep rendering either `content` or `page.html`, and keep stable article landmarks for accessibility.

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

`Toc` renders page headings and tracks the active heading.

| Prop | Notes |
| --- | --- |
| `page` | Required current page with `headings`. |
| `controller` | Optional `SvedocsTocController`; `DocsLayout` passes a shared controller. |

Use `createTocController({ page })` in a custom layout when the ToC and article body need to share active-heading state.

## RenderError

`RenderError` is the default error boundary UI for rendering failures inside the theme. The bundled `DocsApp`, `Root`, `Error`, `Docs`, `Layout`, `DocsShell`, `PageShell`, `Home`, and `Article` components catch local render errors with `<svelte:boundary>` and render this component instead of taking down the whole route.

| Prop | Notes |
| --- | --- |
| `error` | Unknown thrown value from the boundary. |
| `reset` | Optional Svelte boundary reset callback. |
| `title`, `message`, `label` | User-facing copy for the failed area. |
| `variant` | `layout`, `article`, `content`, `navigation`, `tools`, `section`, or a custom string. |
| `page` | Current page when available. |
| `context` | Optional `SvedocsThemeContext`. |
| `tree` | Optional navigation tree used for a docs-home action. |

Replace `RenderError` when your theme needs different recovery actions, logging, telemetry, or copy. Keep failures contained: an article error should leave the header and sidebar visible, while a sidebar or ToC error should not hide the article.

## Search

`Search` renders the search trigger and dialog. The behavior lives in `createSearchController`.

| Prop | Notes |
| --- | --- |
| `records` | Initial local records. |
| `loadRecords` | Lazy record loader. |
| `scope` | Locale/kind filter. |
| `provider` | `local`, `local-json`, or a hosted provider id. |
| `endpoint` | Search route, defaults to `/api/search`. |
| `buildMode` | `edge`, `static`, `spa`, or a custom string. |
| `controller` | Optional shared `SvedocsSearchController`. |

```svelte
<script lang="ts">
  import { createSearchController } from 'svedocs/theme/headless';
  import type { SvedocsSearchProps } from 'svedocs/theme/types';

  export let records: SvedocsSearchProps['records'] = [];
  export let loadRecords: SvedocsSearchProps['loadRecords'];
  export let scope: SvedocsSearchProps['scope'] = {};

  const search = createSearchController({ records, loadRecords, scope });
</script>

<button type="button" on:click={search.show}>Search</button>
```

The default search also listens for `window` event `svedocs:open-search`.

## AskAi

`AskAi` renders the Ask AI panel. The behavior lives in `createAskAiController`.

| Prop | Notes |
| --- | --- |
| `config` | Required resolved config; `config.ai.enabled` controls availability. |
| `records` | Initial local search records for fallback answers. |
| `loadRecords` | Lazy record loader. |
| `scope` | Locale/kind filter. |
| `endpoint` | Ask route, defaults to `/api/ask`. |
| `buildMode` | Runtime mode; non-edge builds use local fallback behavior. |
| `controller` | Optional shared `SvedocsAskAiController`. |

```svelte
<script lang="ts">
  import { createAskAiController } from 'svedocs/theme/headless';
  import type { SvedocsAskAiProps } from 'svedocs/theme/types';

  export let config: SvedocsAskAiProps['config'];
  const ask = createAskAiController({ config });
</script>

<button type="button" on:click={ask.show}>{config.ai.label}</button>
```

The default panel accepts JSON responses and `text/event-stream` deltas. It also listens for `window` event `svedocs:open-ai`.

## Footer

`Footer` renders global footer text and links from `config.theme.footer`.

| Prop | Notes |
| --- | --- |
| `context` | Required `SvedocsThemeContext`. |

The default footer hides on docs article pages and composes `FooterLinks`. A custom footer can choose a different rule by reading `context.isDocsPage` and `context.surface`.

## ThemeToggle

`ThemeToggle` reads and writes `document.documentElement.dataset.theme`, updates `color-scheme`, and stores the selected mode in `localStorage`.

| Prop | Notes |
| --- | --- |
| `defaultMode` | `light`, `dark`, or `system`; defaults to `system`. |

Use `createThemeModeController(defaultMode)` for custom toggles.

## PageTools

`PageTools` renders floating article tools: Ask AI and back-to-top.

| Prop | Notes |
| --- | --- |
| `config` | Required resolved config. |
| `controller` | Optional `SvedocsPageToolsController`. |

Use `createPageToolsController(config)` when you want the same scroll state and `svedocs:open-ai` event without the default floating toolbar.

## Headless helpers

Use `LocalizedLink` with a `SvedocsThemeContext` when a custom Svelte component needs the same current-locale and default-locale link resolution as Markdown and the default navigation.

| Helper | Use it for |
| --- | --- |
| `createThemeContext(input)` | Build the shared context object for custom roots/layouts. |
| `createSearchController(options)` | Query state, local/remote search, active result state, and lazy record loading. |
| `createAskAiController(options)` | Panel state, messages, JSON/SSE requests, and local fallback answers. |
| `createTocController({ page })` | Active heading and indicator position. |
| `createThemeModeController(defaultMode)` | Light/dark mode state, persistence, and system sync. |
| `createMobileNavController()` | Mobile menu open/close and Escape handling. |
| `createPageToolsController(config)` | Floating tool visibility, Ask AI trigger, and back-to-top behavior. |
| `copyTextToClipboard(source)` | Raw clipboard helper. |
| `copyCodeToClipboard(button, source, copiedLabel?, idleLabel?)` | Default code-copy button state helper. |

## Styling contract

Default components use `sd-*` classes and `data-theme-component` attributes. Custom components do not need to reuse those classes. Markdown and code output still includes structural `sd-*` classes so a custom theme can style prose without taking the bundled `styles.css`.

CSS options:

| Import | What it gives you |
| --- | --- |
| `svedocs/theme/styles.css` | Full default theme. |
| `svedocs/theme/base.css` | Minimal reset, accessibility helpers, and prose/code structure. |
| No theme CSS | Complete style ownership by your app or theme package. |
