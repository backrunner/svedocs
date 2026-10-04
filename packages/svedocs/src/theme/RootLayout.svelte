<script lang="ts">
  import { withThemeSlots } from './slots.js';
  import { mountScrollbarVisibility } from './controllers/scrollbars.js';
  import { onDestroy, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { provideSvedocsTheme } from './context.js';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createPageAlternates, createPageMetadata } from '../og/metadata.js';
  import { createDomId, createMobileNavController, createThemeContext, createThemeStyle } from './headless.js';
  import LayoutShell from './LayoutShell.svelte';
  import SafeRenderError from './SafeRenderError.svelte';
  import ThemeInit from './ThemeInit.svelte';
  import { claimThemeInitializer } from './theme-initializer.js';
  import Seo from './Seo.svelte';
  import type { SvedocsThemeComponentMap, SvedocsThemeContext } from './types.js';

  const ownsThemeInitializer = claimThemeInitializer();

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
  export let context: SvedocsThemeContext | undefined = undefined;

  const mobileNav = createMobileNavController();
  let mounted = false;
  let mobileMenuOpen = false;
  let unsubscribeMobileMenu: (() => void) | undefined;
  let stopScrollbarVisibility: (() => void) | undefined;
  const inheritedContext = writable<SvedocsThemeContext>();
  provideSvedocsTheme(inheritedContext);
  $: inheritedContext.set(resolvedContext);

  $: metadata = page ? createPageMetadata(config, page, pages) : undefined;
  $: alternates = page ? createPageAlternates(config, page, pages) : [];
  $: resolvedContext = context ?? createThemeContext({
    config,
    ...(page ? { page } : {}),
    pages,
    tree: tree.length > 0 ? tree : mobileTree,
    search,
    ...(loadSearch ? { loadSearch } : {}),
    ...(localeCode ? { localeCode } : {})
  });
  $: themeStyle = createThemeStyle(config);
  $: mobileMenuId = `sd-mobile-menu-${createDomId(page?.id ?? page?.routePath ?? 'site')}`;
  $: mobileTreePath = mobileCurrentPath || page?.routePath || '';
  $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
  $: title = headTitle || metadata?.title || (page ? config.site.title : `Error - ${config.site.title}`);
  $: description = headDescription || metadata?.description || config.site.description;
  $: robots = headRobots || metadata?.robots || (!page ? 'noindex' : '');
  $: SeoComponent = themeComponents.Seo ?? Seo;
  $: Layout = withThemeSlots(themeComponents.Layout ?? LayoutShell);

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
    document.documentElement.lang = resolvedContext.languageTag;
    document.documentElement.dir = resolvedContext.locale?.dir ?? 'ltr';
  }

  function cleanupSubscriptions() {
    unsubscribeMobileMenu?.();
    unsubscribeMobileMenu = undefined;
    stopScrollbarVisibility?.();
    stopScrollbarVisibility = undefined;
  }
</script>

<svelte:window on:keydown={mobileNav.handleWindowKeydown} />

{#if ownsThemeInitializer}
  <ThemeInit
    defaultMode={config.theme.defaultMode}
    languageTag={resolvedContext.languageTag}
    dir={resolvedContext.locale?.dir ?? 'ltr'}
  />
{/if}

<svelte:component this={SeoComponent} context={resolvedContext} {metadata} {alternates} {title} {description} {robots} />

<svelte:boundary>
  <svelte:component
    this={Layout}
    context={resolvedContext}
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
      context={resolvedContext}
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
          context={resolvedContext}
          tree={resolvedContext.tree}
          variant="layout"
          label={resolvedContext.t('render.layout.label')}
          title={resolvedContext.t('render.layout.title')}
          message={resolvedContext.t('render.layout.message')}
        />
      </main>
    </svelte:component>
  {/snippet}
</svelte:boundary>
