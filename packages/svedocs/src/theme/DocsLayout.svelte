<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createPageTree as createCorePageTree } from '../core/navigation.js';
  import Article from './Article.svelte';
  import { createThemeContext, createTocController } from './headless.js';
  import RootLayout from './RootLayout.svelte';
  import SidebarTree from './SidebarTree.svelte';
  import TableOfContents from './TableOfContents.svelte';
  import type { SvedocsThemeComponentMap } from './types.js';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let content: Component | undefined = undefined;
  export let hasBackgroundSlot: boolean | undefined = undefined;
  export let hasDocHeaderSlot: boolean | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  const tocController = createTocController({ page });
  $: scopedTree = createCorePageTree(filterPagesForCurrentScope(pages, page));
  $: navigationTree = scopedTree.length ? scopedTree : tree;
  $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
  $: showDocHeaderSlot = hasDocHeaderSlot ?? Boolean($$slots['doc-header']);
  $: context = createThemeContext({ config, page, pages, tree: navigationTree, search, ...(loadSearch ? { loadSearch } : {}) });
  $: tocController.setPage(page);
  $: Root = themeComponents.Root ?? RootLayout;
  $: Sidebar = themeComponents.Sidebar ?? SidebarTree;
  $: ArticleComponent = themeComponents.Article ?? Article;
  $: Toc = themeComponents.Toc ?? TableOfContents;

  onMount(() => tocController.mount());

  function filterPagesForCurrentScope(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
    return pages.filter((candidate) => candidate.kind === 'doc'
      && candidate.locale === current.locale);
  }
</script>

<svelte:component
  this={Root}
  {config}
  {page}
  {pages}
  tree={navigationTree}
  {search}
  {loadSearch}
  mobileTree={navigationTree}
  mobileCurrentPath={page.routePath}
  hasBackgroundSlot={showBackgroundSlot}
  {themeComponents}
>
  <svelte:fragment slot="background">
    <slot name="background" />
  </svelte:fragment>
  <div class="sd-doc-shell">
    <aside class="sd-sidebar" aria-label="Documentation">
      <nav>
        <svelte:component this={Sidebar} items={navigationTree} currentPath={page.routePath} />
      </nav>
    </aside>
    <main id="content" class="sd-content">
      <svelte:component this={ArticleComponent} {page} {content} {context} hasDocHeaderSlot={showDocHeaderSlot}>
        <svelte:fragment slot="doc-header" let:page let:breadcrumbs>
          <slot name="doc-header" {page} {breadcrumbs} />
        </svelte:fragment>
      </svelte:component>
    </main>
    <svelte:component this={Toc} {page} controller={tocController} />
  </div>
</svelte:component>
