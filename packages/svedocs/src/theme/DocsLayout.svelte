<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createPageTree as createCorePageTree } from '../core/navigation.js';
  import { createThemeContext, createTocController } from './headless.js';
  import DocsShell from './DocsShell.svelte';
  import SafeRenderError from './SafeRenderError.svelte';
  import RootLayout from './RootLayout.svelte';
  import ThemeInit from './ThemeInit.svelte';
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
  $: Shell = themeComponents.DocsShell ?? DocsShell;
  $: ErrorComponent = SafeRenderError;

  onMount(() => tocController.mount());

  function filterPagesForCurrentScope(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
    return pages.filter((candidate) => candidate.kind === 'doc'
      && candidate.locale === current.locale);
  }
</script>

{#if Root !== RootLayout}
  <ThemeInit
    defaultMode={config.theme.defaultMode}
    languageTag={context.languageTag}
    dir={context.locale?.dir ?? 'ltr'}
  />
{/if}

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
  <svelte:boundary>
    <svelte:component
      this={Shell}
      {page}
      {content}
      {context}
      {navigationTree}
      {themeComponents}
      tocController={tocController}
      hasDocHeaderSlot={showDocHeaderSlot}
    >
      <svelte:fragment slot="doc-header" let:page let:breadcrumbs>
        <slot name="doc-header" {page} {breadcrumbs} />
      </svelte:fragment>
    </svelte:component>
    {#snippet failed(error, reset)}
      <main id="content" class="sd-content">
        <svelte:component
          this={ErrorComponent} component={themeComponents.RenderError}
          {error}
          {reset}
          {page}
          {context}
          tree={navigationTree}
          variant="layout"
          label={context.t('render.docs.label')}
          title={context.t('render.docs.title')}
          message={context.t('render.docs.message')}
        />
      </main>
    {/snippet}
  </svelte:boundary>
</svelte:component>
