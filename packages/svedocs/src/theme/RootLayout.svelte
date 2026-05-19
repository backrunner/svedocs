<script lang="ts">
  import { onMount } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord } from '../core/types.js';
  import { createPageAlternates, createPageMetadata } from '../og/metadata.js';
  import type { SearchScope } from '../search/types.js';
  import AskAiPanel from './AskAiPanel.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import SearchDialog from './SearchDialog.svelte';
  import ScopeSwitcher from './ScopeSwitcher.svelte';
  import ThemeToggle from './ThemeToggle.svelte';

  export let config: SvedocsResolvedConfig;
  export let page: SvedocsPage | undefined = undefined;
  export let pages: SvedocsPage[] = [];
  export let search: SvedocsSearchRecord[] = [];

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

  let mounted = false;

  onMount(() => {
    mounted = true;
    markHydratedRoute();
  });

  $: if (mounted) markHydratedRoute();

  function markHydratedRoute() {
    document.documentElement.dataset.svedocsRoute = page?.routePath ?? '';
    document.documentElement.lang = page?.locale ?? config.i18n.defaultLocale ?? 'en';
  }

  function createRuntimeScope(mode: 'current' | 'all', page: SvedocsPage | undefined): SearchScope {
    if (mode === 'all' || !page) return {};
    return {
      ...(page.locale ? { locale: page.locale } : {}),
      ...(page.version ? { version: page.version } : {})
    };
  }

  function createThemeStyle(config: SvedocsResolvedConfig): string {
    const accent = resolveColor(config.theme.palette.accent, accentPalette.emerald);
    return [
      `--font-sans:${config.theme.fonts.sans}`,
      `--font-mono:${config.theme.fonts.mono}`,
      `--sd-font-display:${config.theme.fonts.display}`,
      `--sd-radius:${config.theme.radius}`,
      `--sd-accent:${accent}`
    ].join(';');
  }

  function linkRel(item: { external?: boolean; rel?: string }): string | undefined {
    return item.external ? 'noreferrer' : item.rel;
  }

  function resolveColor(value: string, fallback: string): string {
    if (/^(#|rgb|hsl|oklch|color-mix)/.test(value)) return value;
    return accentPalette[value] ?? fallback;
  }
</script>

<svelte:head>
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

<div class="sd-root" data-theme={config.theme.defaultMode} style={themeStyle}>
  <a class="sd-skip" href="#content">Skip to content</a>
  <header class="sd-topbar">
    <a class="sd-brand" href={config.theme.brand.href}>
      {#if config.theme.brand.logo}
        <img class="sd-brand-logo" src={config.theme.brand.logo} alt="" />
      {:else if config.theme.brand.mark !== false}
        <span class="sd-brand-mark" aria-hidden="true"></span>
      {/if}
      <span>{config.theme.brand.label}</span>
    </a>
    <nav class="sd-topnav" aria-label="Primary">
      {#each config.theme.nav as item}
        <a href={item.href} rel={linkRel(item)} target={item.external ? '_blank' : undefined}>
          {item.label}
        </a>
    {/each}
    </nav>
    {#if config.theme.social.length > 0}
      <nav class="sd-socialnav" aria-label="Social links">
        {#each config.theme.social as item}
          <a href={item.href} rel={linkRel(item)} target={item.external ? '_blank' : undefined}>
            {item.label}
          </a>
        {/each}
      </nav>
    {/if}
    {#if config.search.enabled}
      <SearchDialog records={search} scope={searchScope} provider={config.search.provider} />
    {/if}
    <ScopeSwitcher {page} {pages} locales={config.i18n.locales} versions={config.versions.items} />
    <CommandPalette {config} {page} {pages} records={search} scope={searchScope} />
    <AskAiPanel {config} records={search} scope={aiScope} />
    <ThemeToggle defaultMode={config.theme.defaultMode} />
  </header>
  <slot />
  {#if config.theme.footer !== false}
    <footer class="sd-footer">
      <span>{config.theme.footer.text}</span>
      {#if config.theme.footer.links.length > 0}
        <nav aria-label="Footer">
          {#each config.theme.footer.links as item}
            <a href={item.href} rel={linkRel(item)} target={item.external ? '_blank' : undefined}>{item.label}</a>
          {/each}
        </nav>
      {/if}
    </footer>
  {/if}
</div>
