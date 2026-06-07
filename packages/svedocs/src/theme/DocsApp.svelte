<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import DocsLayout from './DocsLayout.svelte';
  import HomePage from './HomePage.svelte';
  import PageLayout from './PageLayout.svelte';
  import RouteRenderError from './RouteRenderError.svelte';
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
  $: Home = themeComponents.Home ?? HomePage;
  $: Page = themeComponents.Page ?? PageLayout;
  $: Docs = themeComponents.Docs ?? DocsLayout;
  $: hasBackgroundSlot = Boolean($$slots.background);
  $: hasLandingSlot = Boolean($$slots.landing);
  $: hasHomeHeroVisualSlot = Boolean($$slots['home-hero-visual']);
  $: hasHomeFeaturesSlot = Boolean($$slots['home-features']);
  $: hasDocHeaderSlot = Boolean($$slots['doc-header']);
</script>

{#if customLayout}
  <svelte:boundary>
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
    {#snippet failed(error, reset)}
      <svelte:component
        this={RouteRenderError}
        {error}
        {reset}
        {page}
        {pages}
        {tree}
        {search}
        {config}
        {loadSearch}
        {themeComponents}
        label="Custom layout issue"
        title="The custom layout could not render"
        message="A custom page layout failed while rendering. The route is still loaded; retry after fixing the component."
      />
    {/snippet}
  </svelte:boundary>
  {:else if page.routePath === '/' || page.frontmatter.layout === 'home'}
    <svelte:boundary>
      <svelte:component
        this={Home}
        {page}
        {pages}
        {tree}
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
        <svelte:fragment slot="landing" let:page let:pages let:tree let:search let:config let:content>
          <slot name="landing" {page} {pages} {tree} {search} {config} {content} />
        </svelte:fragment>
        <svelte:fragment slot="home-hero-visual" let:page let:pages let:config>
          <slot name="home-hero-visual" {page} {pages} {config} />
        </svelte:fragment>
        <svelte:fragment slot="home-features" let:page let:pages let:config let:cards>
          <slot name="home-features" {page} {pages} {config} {cards} />
        </svelte:fragment>
      </svelte:component>
      {#snippet failed(error, reset)}
        <svelte:component
          this={RouteRenderError}
          {error}
          {reset}
          {page}
          {pages}
          {tree}
          {search}
          {config}
          {loadSearch}
          {themeComponents}
          label="Home layout issue"
          title="The home page could not render"
          message="The home layout failed while rendering. Retry after checking the home component or slot."
        />
      {/snippet}
    </svelte:boundary>
  {:else if page.kind === 'page' || page.frontmatter.layout === 'page'}
    <svelte:boundary>
      <svelte:component this={Page} {page} {pages} {tree} {search} {config} {loadSearch} content={components[page.id]} {hasBackgroundSlot} {themeComponents}>
        <svelte:fragment slot="background">
          <slot name="background" />
        </svelte:fragment>
      </svelte:component>
      {#snippet failed(error, reset)}
        <svelte:component
          this={RouteRenderError}
          {error}
          {reset}
          {page}
          {pages}
          {tree}
          {search}
          {config}
          {loadSearch}
          {themeComponents}
          label="Page layout issue"
          title="This page could not render"
          message="The page layout failed while rendering. Retry this route or inspect the replacement component."
        />
      {/snippet}
    </svelte:boundary>
  {:else}
    <svelte:boundary>
      <svelte:component this={Docs} {page} {pages} {tree} {search} {config} {loadSearch} content={components[page.id]} {hasBackgroundSlot} {hasDocHeaderSlot} {themeComponents}>
        <svelte:fragment slot="background">
          <slot name="background" />
        </svelte:fragment>
        <svelte:fragment slot="doc-header" let:page let:breadcrumbs>
          <slot name="doc-header" {page} {breadcrumbs} />
        </svelte:fragment>
      </svelte:component>
      {#snippet failed(error, reset)}
        <svelte:component
          this={RouteRenderError}
          {error}
          {reset}
          {page}
          {pages}
          {tree}
          {search}
          {config}
          {loadSearch}
          {themeComponents}
          label="Documentation layout issue"
          title="This documentation page could not render"
          message="The documentation layout failed while rendering. Retry this route or inspect the replacement component."
        />
      {/snippet}
    </svelte:boundary>
  {/if}
