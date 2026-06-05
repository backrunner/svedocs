<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createPageAlternates, createPageMetadata } from '../og/metadata.js';
  import AskAiPanel from './AskAiPanel.svelte';
  import Footer from './Footer.svelte';
  import { createDomId, createMobileNavController, createThemeContext, createThemeInitScript, createThemeStyle } from './headless.js';
  import Navbar from './Navbar.svelte';
  import PageTools from './PageTools.svelte';
  import type { SvedocsThemeComponentMap } from './types.js';

  export let config: SvedocsResolvedConfig;
  export let page: SvedocsPage | undefined = undefined;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let mobileTree: SvedocsTreeItem[] = [];
  export let mobileCurrentPath = '';
  export let hasBackgroundSlot: boolean | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  const mobileNav = createMobileNavController();
  let mounted = false;
  let mobileMenuOpen = false;
  let unsubscribeMobileMenu: (() => void) | undefined;

  $: metadata = page ? createPageMetadata(config, page) : undefined;
  $: alternates = page ? createPageAlternates(config, page, pages) : [];
  $: jsonLd = metadata ? JSON.stringify(metadata.jsonLd) : '';
  $: themeStyle = createThemeStyle(config);
  $: context = createThemeContext({
    config,
    ...(page ? { page } : {}),
    pages,
    tree: tree.length > 0 ? tree : mobileTree,
    search,
    ...(loadSearch ? { loadSearch } : {})
  });
  $: mobileMenuId = `sd-mobile-menu-${createDomId(page?.id ?? page?.routePath ?? 'site')}`;
  $: mobileTreePath = mobileCurrentPath || page?.routePath || '';
  $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
  $: NavbarComponent = themeComponents.Navbar ?? Navbar;
  $: AskAiComponent = themeComponents.AskAi ?? AskAiPanel;
  $: FooterComponent = themeComponents.Footer ?? Footer;
  $: PageToolsComponent = themeComponents.PageTools ?? PageTools;

  onMount(() => {
    mounted = true;
    unsubscribeMobileMenu = mobileNav.open.subscribe((value) => (mobileMenuOpen = value));
    markHydratedRoute();
    return () => unsubscribeMobileMenu?.();
  });

  onDestroy(() => {
    unsubscribeMobileMenu?.();
  });

  $: if (mounted) {
    page?.routePath;
    page?.locale;
    markHydratedRoute();
    mobileNav.close();
  }

  function markHydratedRoute() {
    document.documentElement.dataset.svedocsRoute = page?.routePath ?? '';
    document.documentElement.lang = page?.locale ?? config.i18n.defaultLocale ?? 'en';
  }
</script>

<svelte:window on:keydown={mobileNav.handleWindowKeydown} />

<svelte:head>
  {@html createThemeInitScript(config.theme.defaultMode)}
  <title>{metadata?.title ?? config.site.title}</title>
  <meta name="description" content={metadata?.description ?? config.site.description} />
  {#if metadata?.canonical}
    <link rel="canonical" href={metadata.canonical} />
  {/if}
  {#each alternates as alternate}
    <link rel="alternate" hreflang={alternate.lang} href={alternate.href} />
  {/each}
  {#if metadata}
    <meta property="og:title" content={metadata.openGraph.title} />
    <meta property="og:description" content={metadata.openGraph.description} />
    <meta property="og:type" content={metadata.openGraph.type} />
    <meta property="og:site_name" content={metadata.openGraph.siteName} />
    {#if metadata.openGraph.url}
      <meta property="og:url" content={metadata.openGraph.url} />
    {/if}
    {#if metadata.openGraph.image}
      <meta property="og:image" content={metadata.openGraph.image} />
    {/if}
    {#if metadata.openGraph.author}
      <meta property="article:author" content={metadata.openGraph.author} />
    {/if}
    {#if metadata.openGraph.publishedTime}
      <meta property="article:published_time" content={metadata.openGraph.publishedTime} />
    {/if}
    {#if metadata.openGraph.updatedTime}
      <meta property="article:modified_time" content={metadata.openGraph.updatedTime} />
    {/if}
    <meta name="twitter:card" content={metadata.twitter.card} />
    <meta name="twitter:title" content={metadata.twitter.title} />
    <meta name="twitter:description" content={metadata.twitter.description} />
    {#if metadata.twitter.image}
      <meta name="twitter:image" content={metadata.twitter.image} />
    {/if}
    <script type="application/ld+json">{jsonLd}</script>
  {/if}
</svelte:head>

<div class:sd-has-background-slot={showBackgroundSlot} class="sd-root" data-surface={context.surface} style={themeStyle}>
  <a class="sd-skip" href="#content">Skip to content</a>
  {#if showBackgroundSlot}
    <div class="sd-background-slot" aria-hidden="true">
      <slot name="background" />
    </div>
  {/if}
  <svelte:component
    this={NavbarComponent}
    {context}
    {mobileTree}
    mobileCurrentPath={mobileTreePath}
    {mobileMenuId}
    {mobileMenuOpen}
    {themeComponents}
    onToggleMobileMenu={mobileNav.toggle}
    onCloseMobileMenu={mobileNav.close}
  />
  <slot />
  {#if context.isDocsPage}
    {#if config.ai.enabled}
      <svelte:component
        this={AskAiComponent}
        {config}
        records={search}
        loadRecords={loadSearch}
        scope={context.aiScope}
        buildMode={config.build.mode}
      />
    {/if}
    <svelte:component this={PageToolsComponent} {config} />
  {/if}
  <svelte:component this={FooterComponent} {context} />
</div>
