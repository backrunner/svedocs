<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
    import DocsLayout from './DocsLayout.svelte';
    import HomePage from './HomePage.svelte';
    import PageLayout from './PageLayout.svelte';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let components: Record<string, Component> = {};
  export let layouts: Record<string, Component> = {};

  $: layoutName = typeof page.frontmatter.layout === 'string' ? page.frontmatter.layout : '';
  $: customLayout = layoutName && layoutName !== 'home' && layoutName !== 'docs' ? layouts[layoutName] : undefined;
</script>

{#if customLayout}
  <svelte:component
    this={customLayout}
    {page}
    {pages}
    {tree}
    {search}
    {config}
    content={components[page.id]}
  />
  {:else if page.routePath === '/' || page.frontmatter.layout === 'home'}
    <HomePage {page} {pages} {search} {config} content={components[page.id]} />
  {:else if page.kind === 'page' || page.frontmatter.layout === 'page'}
    <PageLayout {page} {pages} {search} {config} content={components[page.id]} />
  {:else}
    <DocsLayout {page} {pages} {tree} {search} {config} content={components[page.id]} />
  {/if}
