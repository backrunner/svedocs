<script lang="ts">
  import { withThemeSlots } from './slots.js';
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createThemeContext } from './headless.js';
  import PageShell from './PageShell.svelte';
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
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};
  export let context: SvedocsThemeContext | undefined = undefined;

  $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
  $: Root = withThemeSlots(themeComponents.Root ?? RootLayout);
  $: Shell = themeComponents.PageShell ?? PageShell;
  $: resolvedContext = context ?? createThemeContext({ config, page, pages, tree, search, ...(loadSearch ? { loadSearch } : {}) });
</script>

{#if Boolean(themeComponents.Root)}
  <ThemeInit
    defaultMode={config.theme.defaultMode}
    languageTag={resolvedContext.languageTag}
    dir={resolvedContext.locale?.dir ?? 'ltr'}
  />
{/if}

<svelte:component this={Root} context={resolvedContext} {config} {page} {pages} {tree} {search} {loadSearch} hasBackgroundSlot={showBackgroundSlot} {themeComponents}>
  <svelte:fragment slot="background">
    <slot name="background" />
  </svelte:fragment>
  <svelte:component
    this={Shell}
    {page}
    {content}
    title={page.title}
    description={page.description ?? ''}
    kicker={config.site.name}
    html={page.html}
    context={resolvedContext}
    {themeComponents}
  />
</svelte:component>
