<script lang="ts">
  import { withThemeSlots } from './slots.js';
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createThemeContext, createTocController } from './headless.js';
  import DocsShell from './DocsShell.svelte';
  import SafeRenderError from './SafeRenderError.svelte';
  import RootLayout from './RootLayout.svelte';
  import ThemeInit from './ThemeInit.svelte';
  import type { SvedocsThemeComponentMap, SvedocsThemeContext } from './types.js';

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
  export let context: SvedocsThemeContext | undefined = undefined;

  const tocController = createTocController({ page });
  $: navigationTree = resolvedContext.tree;
  $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
  $: showDocHeaderSlot = hasDocHeaderSlot ?? Boolean($$slots['doc-header']);
  $: resolvedContext = context ?? createThemeContext({ config, page, pages, tree, search, ...(loadSearch ? { loadSearch } : {}) });
  $: tocController.setPage(page);
  $: Root = withThemeSlots(themeComponents.Root ?? RootLayout);
  $: Shell = withThemeSlots(themeComponents.DocsShell ?? DocsShell);
  $: ErrorComponent = SafeRenderError;

  onMount(() => tocController.mount());

</script>

{#if Boolean(themeComponents.Root)}
  <ThemeInit
    defaultMode={config.theme.defaultMode}
    languageTag={resolvedContext.languageTag}
    dir={resolvedContext.locale?.dir ?? 'ltr'}
  />
{/if}

<svelte:component
  this={Root}
  context={resolvedContext}
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
      context={resolvedContext}
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
          context={resolvedContext}
          tree={navigationTree}
          variant="layout"
          label={resolvedContext.t('render.docs.label')}
          title={resolvedContext.t('render.docs.title')}
          message={resolvedContext.t('render.docs.message')}
        />
      </main>
    {/snippet}
  </svelte:boundary>
</svelte:component>
