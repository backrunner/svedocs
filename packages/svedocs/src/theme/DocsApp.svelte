<script lang="ts">
  import { withThemeSlots } from './slots.js';
  import type { Component } from 'svelte';
  import { writable } from 'svelte/store';
  import { provideSvedocsTheme } from './context.js';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createThemeContext } from './headless.js';
  import DocsLayout from './DocsLayout.svelte';
  import HomePage from './HomePage.svelte';
  import PageLayout from './PageLayout.svelte';
  import RouteRenderError from './RouteRenderError.svelte';
  import ThemeInit from './ThemeInit.svelte';
  import type { SvedocsCustomLayoutProps, SvedocsThemeComponentMap } from './types.js';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let components: Record<string, Component> = {};
  export let content: Component | undefined = undefined;
  export let layout: Component<SvedocsCustomLayoutProps> | undefined = undefined;
  export let layouts: Record<string, Component> = {};
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;

  $: layoutName = typeof page.frontmatter.layout === 'string' ? page.frontmatter.layout : '';
  $: customLayout = layout ?? (layoutName && !['home', 'docs', 'page'].includes(layoutName) ? layouts[layoutName] : undefined);
  $: pageContent = content ?? components[page.id];
  $: Home = withThemeSlots(themeComponents.Home ?? HomePage);
  $: Page = withThemeSlots(themeComponents.Page ?? PageLayout);
  $: Docs = withThemeSlots(themeComponents.Docs ?? DocsLayout);
  $: hasBackgroundSlot = Boolean($$slots.background);
  $: hasLandingSlot = Boolean($$slots.landing);
  $: hasHomeHeroVisualSlot = Boolean($$slots['home-hero-visual']);
  $: hasHomeFeaturesSlot = Boolean($$slots['home-features']);
  $: hasDocHeaderSlot = Boolean($$slots['doc-header']);
  $: appContext = createThemeContext({ config, page, pages, tree, search, ...(loadSearch ? { loadSearch } : {}) });
  const inheritedContext = writable(createThemeContext({ config, page, pages, tree, search }));
  provideSvedocsTheme(inheritedContext);
  $: inheritedContext.set(appContext);
</script>

{#if customLayout}
  <ThemeInit
    defaultMode={config.theme.defaultMode}
    languageTag={appContext.languageTag}
    dir={appContext.locale?.dir ?? 'ltr'}
  />
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
      content={pageContent}
      context={appContext}
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
        label={appContext.t('render.custom.label')}
        title={appContext.t('render.custom.title')}
        message={appContext.t('render.custom.message')}
      />
    {/snippet}
  </svelte:boundary>
  {:else if page.scopePath === '/' || page.frontmatter.layout === 'home'}
    {#if Boolean(themeComponents.Home)}
      <ThemeInit
        defaultMode={config.theme.defaultMode}
        languageTag={appContext.languageTag}
        dir={appContext.locale?.dir ?? 'ltr'}
      />
    {/if}
    <svelte:boundary>
      <svelte:component
        this={Home}
        {page}
        {pages}
        {tree}
        {search}
        {config}
        {loadSearch}
        content={pageContent}
        {themeComponents}
        {hasBackgroundSlot}
        {hasLandingSlot}
        {hasHomeHeroVisualSlot}
        {hasHomeFeaturesSlot}
      >
        <svelte:fragment slot="background">
          <slot name="background" />
        </svelte:fragment>
        <svelte:fragment slot="landing" let:page let:pages let:tree let:search let:config let:content let:context>
          <slot name="landing" {page} {pages} {tree} {search} {config} {content} {context} />
        </svelte:fragment>
        <svelte:fragment slot="home-hero-visual" let:page let:pages let:config let:context>
          <slot name="home-hero-visual" {page} {pages} {config} {context} />
        </svelte:fragment>
        <svelte:fragment slot="home-features" let:page let:pages let:config let:cards let:context>
          <slot name="home-features" {page} {pages} {config} {cards} {context} />
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
          label={appContext.t('render.home.label')}
          title={appContext.t('render.home.title')}
          message={appContext.t('render.home.message')}
        />
      {/snippet}
    </svelte:boundary>
  {:else if page.kind === 'page' || page.frontmatter.layout === 'page'}
    {#if Boolean(themeComponents.Page)}
      <ThemeInit
        defaultMode={config.theme.defaultMode}
        languageTag={appContext.languageTag}
        dir={appContext.locale?.dir ?? 'ltr'}
      />
    {/if}
    <svelte:boundary>
      <svelte:component this={Page} {page} {pages} {tree} {search} {config} {loadSearch} content={pageContent} {hasBackgroundSlot} {themeComponents}>
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
          label={appContext.t('render.page.label')}
          title={appContext.t('render.page.title')}
          message={appContext.t('render.page.message')}
        />
      {/snippet}
    </svelte:boundary>
  {:else}
    {#if Boolean(themeComponents.Docs)}
      <ThemeInit
        defaultMode={config.theme.defaultMode}
        languageTag={appContext.languageTag}
        dir={appContext.locale?.dir ?? 'ltr'}
      />
    {/if}
    <svelte:boundary>
      <svelte:component this={Docs} {page} {pages} {tree} {search} {config} {loadSearch} content={pageContent} {hasBackgroundSlot} {hasDocHeaderSlot} {themeComponents}>
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
          label={appContext.t('render.docs.label')}
          title={appContext.t('render.docs.title')}
          message={appContext.t('render.docs.message')}
        />
      {/snippet}
    </svelte:boundary>
  {/if}
