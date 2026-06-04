<script lang="ts">
  import { onMount } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createPageAlternates, createPageMetadata } from '../og/metadata.js';
  import type { SearchScope } from '../search/types.js';
  import AskAiPanel from './AskAiPanel.svelte';
  import FloatingToolbar from './FloatingToolbar.svelte';
  import SearchDialog from './SearchDialog.svelte';
  import SidebarTree from './SidebarTree.svelte';
  import ScopeSwitcher from './ScopeSwitcher.svelte';
  import ThemeToggle from './ThemeToggle.svelte';

  export let config: SvedocsResolvedConfig;
  export let page: SvedocsPage | undefined = undefined;
  export let pages: SvedocsPage[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let mobileTree: SvedocsTreeItem[] = [];
  export let mobileCurrentPath = '';
  export let hasBackgroundSlot: boolean | undefined = undefined;

  const accentPalette: Record<string, string> = {
    emerald: '#007f68',
    teal: '#087f8c',
    sky: '#0969da',
    indigo: '#4f46e5',
    rose: '#c83e4d',
    amber: '#b36b00'
  };

  $: metadata = page ? createPageMetadata(config, page) : undefined;
  $: alternates = page ? createPageAlternates(config, page, pages) : [];
  $: jsonLd = metadata ? JSON.stringify(metadata.jsonLd) : '';
  $: themeStyle = createThemeStyle(config);
  $: searchScope = createRuntimeScope(config.search.scope, page);
  $: aiScope = createRuntimeScope(config.ai.scope, page);
  $: surface = page?.frontmatter.layout === 'home' || page?.routePath === '/' ? 'home' : 'reading';
  $: isDocsPage = page?.kind === 'doc';
  $: mobileMenuId = `sd-mobile-menu-${createDomId(page?.id ?? page?.routePath ?? 'site')}`;
  $: mobileTreePath = mobileCurrentPath || page?.routePath || '';
  $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
  $: activeNavHref = resolveActiveNavHref(config.theme.nav, page?.routePath ?? '/');

  let mounted = false;
  let mobileMenuOpen = false;

  onMount(() => {
    mounted = true;
    markHydratedRoute();
  });

  $: if (mounted) {
    page?.routePath;
    page?.locale;
    markHydratedRoute();
    closeMobileMenu();
  }

  function markHydratedRoute() {
    document.documentElement.dataset.svedocsRoute = page?.routePath ?? '';
    document.documentElement.lang = page?.locale ?? config.i18n.defaultLocale ?? 'en';
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closeMobileMenu();
  }

  function createRuntimeScope(mode: 'current' | 'all', page: SvedocsPage | undefined): SearchScope {
    if (mode === 'all' || !page) return {};
    return {
      ...(page.locale ? { locale: page.locale } : {})
    };
  }

  function createThemeStyle(config: SvedocsResolvedConfig): string {
    const accent = resolveColor(config.theme.palette.accent, accentPalette.emerald);
    return [
      `--font-sans:${config.theme.fonts.sans}`,
      `--font-mono:${config.theme.fonts.mono}`,
      `--sd-font-display:${config.theme.fonts.sans}`,
      `--sd-radius:${config.theme.radius}`,
      `--sd-accent:${accent}`
    ].join(';');
  }

  function createThemeInitScript(defaultMode: 'light' | 'dark' | 'system'): string {
    return `<script>(function(){try{var d=${JSON.stringify(defaultMode)};var s=localStorage.getItem('svedocs-theme');var t=s==='dark'||s==='light'?s:(d==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):d);document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();<\/script>`;
  }

  function linkRel(item: { external?: boolean; rel?: string }): string | undefined {
    return item.external ? 'noreferrer' : item.rel;
  }

  function isActiveNavItem(item: { href: string; external?: boolean }): boolean {
    return !item.external && normalizePath(item.href) === activeNavHref;
  }

  function handleNavClick(event: MouseEvent, href: string, external?: boolean) {
    if (external) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof window === 'undefined') return;

    const target = createComparableUrl(href, window.location.href);
    if (!target) return;

    const current = createComparableUrl(window.location.href, window.location.href);
    if (target === current) event.preventDefault();
  }

  function isGithubFooterLink(item: { label: string; href: string }): boolean {
    return item.label.trim().toLowerCase().includes('github');
  }

  function resolveColor(value: string, fallback: string): string {
    if (/^(#|rgb|hsl|oklch|color-mix)/.test(value)) return value;
    return accentPalette[value] ?? fallback;
  }

  function createDomId(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'site';
  }

  function resolveActiveNavHref(nav: Array<{ href: string; external?: boolean }>, currentPath: string): string {
    const normalizedCurrentPath = normalizePath(currentPath);
    let activeHref = '';

    for (const item of nav) {
      if (item.external) continue;

      const normalizedHref = normalizePath(item.href);
      if (!isPathMatch(normalizedCurrentPath, normalizedHref)) continue;

      if (normalizedHref.length > activeHref.length) activeHref = normalizedHref;
    }

    return activeHref;
  }

  function isPathMatch(currentPath: string, hrefPath: string): boolean {
    if (hrefPath === '/') return currentPath === '/';
    return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`);
  }

  function normalizePath(path: string): string {
    const pathname = getPathname(path);
    const withoutTrailingSlash = pathname.replace(/\/+$/, '');
    return withoutTrailingSlash ? withoutTrailingSlash : '/';
  }

  function getPathname(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        return new URL(path).pathname;
      } catch {
        return path;
      }
    }

    return path.split(/[?#]/, 1)[0] || '/';
  }

  function createComparableUrl(value: string, base: string): string | undefined {
    try {
      const url = new URL(value, base);
      url.pathname = normalizePath(url.pathname);
      return url.href;
    } catch {
      return undefined;
    }
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

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

<div class:sd-has-background-slot={showBackgroundSlot} class="sd-root" data-surface={surface} style={themeStyle}>
  <a class="sd-skip" href="#content">Skip to content</a>
  {#if showBackgroundSlot}
    <div class="sd-background-slot" aria-hidden="true">
      <slot name="background" />
    </div>
  {/if}
  <header class:sd-mobile-menu-open={mobileMenuOpen} class="sd-topbar">
    <a class="sd-brand" href={config.theme.brand.href}>
      {#if config.theme.brand.logo}
        <img class="sd-brand-logo" src={config.theme.brand.logo} alt="" draggable="false" />
      {:else if config.theme.brand.mark !== false}
        <span class="sd-brand-mark" aria-hidden="true"></span>
      {/if}
      <span>{config.theme.brand.label}</span>
    </a>
    <div id={mobileMenuId} class="sd-topbar-menu" class:sd-open={mobileMenuOpen}>
      <nav class="sd-topnav" aria-label="Primary">
        {#each config.theme.nav as item}
          {@const active = isActiveNavItem(item)}
          <a
            class:sd-active={active}
            href={item.href}
            rel={linkRel(item)}
            target={item.external ? '_blank' : undefined}
            aria-current={active ? 'page' : undefined}
            on:click={(event) => handleNavClick(event, item.href, item.external)}
          >
            {item.label}
          </a>
        {/each}
      </nav>
      <div class="sd-topbar-spacer" aria-hidden="true"></div>
      <div class="sd-topbar-tools">
        {#if config.search.enabled}
          <SearchDialog records={search} loadRecords={loadSearch} scope={searchScope} provider={config.search.provider} buildMode={config.build.mode} />
        {/if}
        <ScopeSwitcher {page} {pages} locales={config.i18n.locales} />
      </div>
      {#if config.theme.social.length > 0}
        <nav class="sd-socialnav" aria-label="Social links">
          {#each config.theme.social as item}
            <a href={item.href} rel={linkRel(item)} target={item.external ? '_blank' : undefined}>
              {item.label}
            </a>
          {/each}
        </nav>
      {/if}
      <ThemeToggle defaultMode={config.theme.defaultMode} />
      {#if mobileTree.length > 0}
        <nav class="sd-mobile-docnav" aria-label="Documentation">
          <SidebarTree items={mobileTree} currentPath={mobileTreePath} />
        </nav>
      {/if}
    </div>
    <button
      class="sd-menu-button"
      type="button"
      aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={mobileMenuOpen}
      aria-controls={mobileMenuId}
      on:click={toggleMobileMenu}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        {#if mobileMenuOpen}
          <path d="M6 6l12 12M18 6 6 18" />
        {:else}
          <path d="M4 7h16M4 12h16M4 17h16" />
        {/if}
      </svg>
    </button>
  </header>
  <slot />
  {#if isDocsPage}
    {#if config.ai.enabled}
      <AskAiPanel {config} records={search} loadRecords={loadSearch} scope={aiScope} buildMode={config.build.mode} />
    {/if}
    <FloatingToolbar {config} />
  {/if}
  {#if config.theme.footer !== false && !isDocsPage}
    <footer class="sd-footer">
      <span>{config.theme.footer.text}</span>
      {#if config.theme.footer.links.length > 0}
        <nav aria-label="Footer">
          {#each config.theme.footer.links as item}
            {#if isGithubFooterLink(item)}
              <a
                class="sd-footer-icon"
                href={item.href}
                rel={linkRel(item)}
                target={item.external ? '_blank' : undefined}
                aria-label={item.label}
                title={item.label}
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
                  <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
              </a>
            {:else}
              <a href={item.href} rel={linkRel(item)} target={item.external ? '_blank' : undefined}>{item.label}</a>
            {/if}
          {/each}
        </nav>
      {/if}
    </footer>
  {/if}
</div>
