---
title: Custom pages
description: Use Svelte content components, named layouts, and native SvelteKit routes.
order: 4
---

# Custom pages

Keep articles in Markdown and use Svelte where a page needs interaction or its own layout. The [theme preview](/theme-preview) uses the content component API described here.

## Replace a page’s content

Create a content file so the page participates in navigation, search, SEO, translations, and the agent interface:

```md title="content/pages/playground.md"
---
title: Playground
description: Try the available options.
layout: page
---

Choose an option to preview its effect. This text also describes the page to search and agent clients.
```

Map its canonical route to a Svelte component in the Vite plugin:

```ts title="vite.config.ts"
svedocs({
  pageComponents: {
    '/playground': '$lib/Playground.svelte'
  }
});
```

`pageComponents` replaces the rendered body, including an existing SVX/MDX body. The Markdown file remains the source for metadata, search text, headings, and markdown twins; keep it consistent with what the component displays. Route keys must identify existing content pages. Register each localized route explicitly when sharing a component across languages.

```svelte title="src/lib/Playground.svelte"
<script lang="ts">
  import { useSvedocsTheme, resolveLocalizedHref } from 'svedocs/theme/headless';
  const theme = useSvedocsTheme();
  let count = $state(0);
</script>

<button onclick={() => count += 1}>{count}</button>
<a href={resolveLocalizedHref('/docs', $theme)}>{$theme.t('nav.docs')}</a>
```

Call `useSvedocsTheme()` during component initialization. It returns a store that updates on client navigation, including locale changes. Page components receive their shared data from this context rather than required props.

## Replace the layout

Register a named layout with `svedocs({ layouts: { feature: '$lib/FeatureLayout.svelte' } })`, then set `layout: feature` in the page’s frontmatter. Unknown names produce an error that identifies the page and missing registration.

Named layouts receive `SvedocsCustomLayoutProps`. Forward the route data when composing the default root so search, navigation, metadata, and theme replacements continue to work:

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

For a change that applies to every article or navigation bar, use [theme component replacement](/docs/configuration/theme) instead of assigning layouts to individual pages.

## Load the current page

Generated templates load page data, Svelte content, and named layouts on demand. For an existing project, update the universal route loader after resolving its page from `virtual:svedocs/page-index`:

```ts
import { loadSvedocsPage } from 'svedocs/routes';
import pageLoaders from 'virtual:svedocs/page-loaders';
import componentLoaders from 'virtual:svedocs/component-loaders';
import layoutLoaders from 'virtual:svedocs/layout-loaders';

// Inside the existing universal +page.ts load function:
const loaded = await loadSvedocsPage(resolution.page, {
  pages: pageLoaders,
  components: componentLoaders,
  layouts: layoutLoaders
});
return { ...loaded, pages, tree, search: [], config };
```

Keep this in `+page.ts`. A server-only `+page.server.ts` cannot serialize Svelte component functions. Pass the result into the renderer:

```svelte
<DocsApp
  page={data.page} pages={data.pages} config={data.config}
  tree={data.tree} search={data.search}
  content={data.content} layout={data.layout}
  {themeComponents} {loadSearch}
/>
```

Remove imports of `virtual:svedocs/components` and `virtual:svedocs/layouts` from the route component to avoid fetching every page component on entry. Those eager modules and the `components`/`layouts` props remain available for existing integrations. Explicit `content` and `layout` props take precedence.

Only the selected loaders run, and their imports run concurrently. Search records can still be deferred with `virtual:svedocs/search-loader`. The default ToC caches heading positions and remeasures when layout changes, avoiding a geometry read for every heading on each scroll event.

## Native SvelteKit pages

For a tool with its own data loading, form actions, or authentication, create `src/routes/tool/+page.svelte` and the usual SvelteKit load or action files. Compose `RootLayout` if you want the shared site shell, or use your own shell and the [headless controllers](/docs/reference/theme-components).

Native routes do not enter the content manifest automatically. Add a matching Markdown content file if they should appear in search, navigation, sitemaps, or the agent interface. Maintain its metadata and text alongside the native page.
