<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createJsonLdScript, createPageAlternates, createPageMetadata } from '../og/metadata.js';
  import { createDomId, createMobileNavController, createThemeContext, createThemeInitScript, createThemeStyle } from './headless.js';
  import LayoutShell from './LayoutShell.svelte';
  import SafeRenderError from './SafeRenderError.svelte';
  import type { SvedocsThemeComponentMap } from './types.js';

  export let config: SvedocsResolvedConfig;
  export let page: SvedocsPage | undefined = undefined;
  export let localeCode: string | undefined = undefined;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let headTitle = '';
  export let headDescription = '';
  export let headRobots = '';
  export let mobileTree: SvedocsTreeItem[] = [];
  export let mobileCurrentPath = '';
  export let hasBackgroundSlot: boolean | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  const mobileNav = createMobileNavController();
  let mounted = false;
  let mobileMenuOpen = false;
  let unsubscribeMobileMenu: (() => void) | undefined;
  let stopScrollbarVisibility: (() => void) | undefined;

  $: metadata = page ? createPageMetadata(config, page, pages) : undefined;
  $: alternates = page ? createPageAlternates(config, page, pages) : [];
  $: jsonLdScripts = metadata ? [
    createJsonLdScript(metadata.jsonLd),
    ...metadata.head.jsonLd.map((entry) => createJsonLdScript(entry))
  ] : [];
  $: context = createThemeContext({
    config,
    ...(page ? { page } : {}),
    pages,
    tree: tree.length > 0 ? tree : mobileTree,
    search,
    ...(loadSearch ? { loadSearch } : {}),
    ...(localeCode ? { localeCode } : {})
  });
  $: themeInitScript = createThemeInitScript(config.theme.defaultMode, context.languageTag, context.locale?.dir ?? 'ltr');
  $: themeStyle = createThemeStyle(config);
  $: mobileMenuId = `sd-mobile-menu-${createDomId(page?.id ?? page?.routePath ?? 'site')}`;
  $: mobileTreePath = mobileCurrentPath || page?.routePath || '';
  $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
  $: title = headTitle || metadata?.title || (page ? config.site.title : `Error - ${config.site.title}`);
  $: description = headDescription || metadata?.description || config.site.description;
  $: robots = headRobots || metadata?.robots || (!page ? 'noindex' : '');
  $: Layout = themeComponents.Layout ?? LayoutShell;

  onMount(() => {
    mounted = true;
    unsubscribeMobileMenu = mobileNav.open.subscribe((value) => (mobileMenuOpen = value));
    stopScrollbarVisibility = mountScrollbarVisibility();
    markHydratedRoute();
    return cleanupSubscriptions;
  });

  onDestroy(() => {
    cleanupSubscriptions();
  });

  $: if (mounted) {
    page?.routePath;
    page?.locale;
    markHydratedRoute();
    mobileNav.close();
  }

  function markHydratedRoute() {
    document.documentElement.dataset.svedocsRoute = page?.routePath ?? '';
    document.documentElement.lang = context.languageTag;
    document.documentElement.dir = context.locale?.dir ?? 'ltr';
  }

  function cleanupSubscriptions() {
    unsubscribeMobileMenu?.();
    unsubscribeMobileMenu = undefined;
    stopScrollbarVisibility?.();
    stopScrollbarVisibility = undefined;
  }

  function mountScrollbarVisibility() {
    const root = document.documentElement;
    const body = document.body;
    const elementTimers = new Map<HTMLElement, number>();
    let windowTimer: number | undefined;

    function markWindowScrolling() {
      root.classList.add('sd-is-window-scrolling');
      body.classList.add('sd-is-window-scrolling');
      if (windowTimer !== undefined) window.clearTimeout(windowTimer);
      windowTimer = window.setTimeout(() => {
        root.classList.remove('sd-is-window-scrolling');
        body.classList.remove('sd-is-window-scrolling');
        windowTimer = undefined;
      }, 900);
    }

    function markElementScrolling(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target === root || target === body) return;
      if (!isScrollableElement(target)) return;
      target.classList.add('sd-is-scrolling');
      const existingTimer = elementTimers.get(target);
      if (existingTimer !== undefined) window.clearTimeout(existingTimer);
      elementTimers.set(target, window.setTimeout(() => {
        target.classList.remove('sd-is-scrolling');
        elementTimers.delete(target);
      }, 900));
    }

    window.addEventListener('scroll', markWindowScrolling, { passive: true });
    document.addEventListener('scroll', markElementScrolling, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', markWindowScrolling);
      document.removeEventListener('scroll', markElementScrolling, { capture: true });
      if (windowTimer !== undefined) window.clearTimeout(windowTimer);
      root.classList.remove('sd-is-window-scrolling');
      body.classList.remove('sd-is-window-scrolling');
      for (const [element, timer] of elementTimers) {
        window.clearTimeout(timer);
        element.classList.remove('sd-is-scrolling');
      }
      elementTimers.clear();
    };
  }

  function isScrollableElement(element: HTMLElement) {
    return element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1;
  }
</script>

<svelte:window on:keydown={mobileNav.handleWindowKeydown} />

<svelte:head>
  {@html themeInitScript}
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if robots}
    <meta name="robots" content={robots} />
  {/if}
  {#if metadata?.keywords.length}
    <meta name="keywords" content={metadata.keywords.join(', ')} />
  {/if}
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
    {#if metadata.openGraph.locale}
      <meta property="og:locale" content={metadata.openGraph.locale} />
    {/if}
    {#each metadata.openGraph.alternateLocales ?? [] as locale}
      <meta property="og:locale:alternate" content={locale} />
    {/each}
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
    {#each metadata.head.meta as tag}
      <meta
        name={tag.name}
        property={tag.property}
        http-equiv={tag.httpEquiv}
        itemprop={tag.itemprop}
        content={tag.content}
      />
    {/each}
    {#each metadata.head.links as tag}
      <link
        rel={tag.rel}
        href={tag.href}
        hreflang={tag.hreflang}
        type={tag.type}
        media={tag.media}
        title={tag.title}
        sizes={tag.sizes}
        as={tag.as}
        crossorigin={tag.crossorigin}
      />
    {/each}
    {#each jsonLdScripts as script}
      {@html script}
    {/each}
  {/if}
</svelte:head>

<svelte:boundary>
  <svelte:component
    this={Layout}
    {context}
    {themeStyle}
    {mobileTree}
    mobileCurrentPath={mobileTreePath}
    {mobileMenuId}
    {mobileMenuOpen}
    hasBackgroundSlot={showBackgroundSlot}
    {themeComponents}
    onToggleMobileMenu={mobileNav.toggle}
    onCloseMobileMenu={mobileNav.close}
  >
    <svelte:fragment slot="background">
      <slot name="background" />
    </svelte:fragment>
    <slot />
  </svelte:component>
  {#snippet failed(error, reset)}
    <svelte:component
      this={LayoutShell}
      {context}
      {themeStyle}
      {mobileTree}
      mobileCurrentPath={mobileTreePath}
      {mobileMenuId}
      {mobileMenuOpen}
      hasBackgroundSlot={showBackgroundSlot}
      {themeComponents}
      onToggleMobileMenu={mobileNav.toggle}
      onCloseMobileMenu={mobileNav.close}
    >
      <svelte:fragment slot="background">
        <slot name="background" />
      </svelte:fragment>
      <main id="content" class="sd-route-render-error" data-theme-component="route-render-error">
        <svelte:component
          this={SafeRenderError} component={themeComponents.RenderError}
          {error}
          {reset}
          {context}
          tree={context.tree}
          variant="layout"
          label={context.t('render.layout.label')}
          title={context.t('render.layout.title')}
          message={context.t('render.layout.message')}
        />
      </main>
    </svelte:component>
  {/snippet}
</svelte:boundary>
