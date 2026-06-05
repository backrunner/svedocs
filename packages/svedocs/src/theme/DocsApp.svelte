<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import DocsLayout from './DocsLayout.svelte';
  import HomePage from './HomePage.svelte';
  import PageLayout from './PageLayout.svelte';
  import type { SvedocsThemeComponentMap } from './types.js';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let components: Record<string, Component> = {};
  export let layouts: Record<string, Component> = {};
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;

  $: layoutName = typeof page.frontmatter.layout === 'string' ? page.frontmatter.layout : '';
  $: customLayout = layoutName && layoutName !== 'home' && layoutName !== 'docs' ? layouts[layoutName] : undefined;
  $: hasBackgroundSlot = Boolean($$slots.background);
  $: hasLandingSlot = Boolean($$slots.landing);
  $: hasHomeHeroVisualSlot = Boolean($$slots['home-hero-visual']);
  $: hasHomeFeaturesSlot = Boolean($$slots['home-features']);
  $: hasDocHeaderSlot = Boolean($$slots['doc-header']);
</script>

{#if customLayout}
  <svelte:component
    this={customLayout}
    {page}
    {pages}
    {tree}
    {search}
    {config}
    {loadSearch}
    {themeComponents}
    content={components[page.id]}
  />
  {:else if page.routePath === '/' || page.frontmatter.layout === 'home'}
    <HomePage
      {page}
      {pages}
      {search}
      {config}
      {loadSearch}
      content={components[page.id]}
      {themeComponents}
      {hasBackgroundSlot}
      {hasLandingSlot}
      {hasHomeHeroVisualSlot}
      {hasHomeFeaturesSlot}
    >
      <svelte:fragment slot="background">
        <slot name="background" />
      </svelte:fragment>
      <svelte:fragment slot="landing" let:page let:pages let:search let:config let:content>
        <slot name="landing" {page} {pages} {search} {config} {content} />
      </svelte:fragment>
      <svelte:fragment slot="home-hero-visual" let:page let:pages let:config>
        <slot name="home-hero-visual" {page} {pages} {config} />
      </svelte:fragment>
      <svelte:fragment slot="home-features" let:page let:pages let:config let:cards>
        <slot name="home-features" {page} {pages} {config} {cards} />
      </svelte:fragment>
    </HomePage>
  {:else if page.kind === 'page' || page.frontmatter.layout === 'page'}
    <PageLayout {page} {pages} {search} {config} {loadSearch} content={components[page.id]} {hasBackgroundSlot} {themeComponents}>
      <svelte:fragment slot="background">
        <slot name="background" />
      </svelte:fragment>
    </PageLayout>
  {:else}
    <DocsLayout {page} {pages} {tree} {search} {config} {loadSearch} content={components[page.id]} {hasBackgroundSlot} {hasDocHeaderSlot} {themeComponents}>
      <svelte:fragment slot="background">
        <slot name="background" />
      </svelte:fragment>
      <svelte:fragment slot="doc-header" let:page let:breadcrumbs>
        <slot name="doc-header" {page} {breadcrumbs} />
      </svelte:fragment>
    </DocsLayout>
  {/if}
