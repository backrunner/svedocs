<script lang="ts">
  import Brand from './Brand.svelte';
  import MobileNav from './MobileNav.svelte';
  import ScopeSwitcher from './ScopeSwitcher.svelte';
  import SearchDialog from './SearchDialog.svelte';
  import SocialNav from './SocialNav.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import TopNav from './TopNav.svelte';
  import type { SvedocsThemeComponentMap, SvedocsThemeContext } from './types.js';
  import type { SvedocsTreeItem } from '../core/types.js';

  export let context: SvedocsThemeContext;
  export let mobileTree: SvedocsTreeItem[] = [];
  export let mobileCurrentPath = '';
  export let mobileMenuId = 'sd-mobile-menu-site';
  export let mobileMenuOpen = false;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};
  export let onToggleMobileMenu: () => void = () => undefined;

  $: BrandComponent = themeComponents.Brand ?? Brand;
  $: TopNavComponent = themeComponents.TopNav ?? TopNav;
  $: Search = themeComponents.Search ?? SearchDialog;
  $: Toggle = themeComponents.ThemeToggle ?? ThemeToggle;
  $: Mobile = themeComponents.MobileNav ?? MobileNav;
  $: Social = themeComponents.SocialNav ?? SocialNav;
</script>

<header class:sd-mobile-menu-open={mobileMenuOpen} class="sd-topbar" data-theme-component="navbar">
  <svelte:component this={BrandComponent} {context} />
  <div id={mobileMenuId} class="sd-topbar-menu" class:sd-open={mobileMenuOpen}>
    <svelte:component this={TopNavComponent} {context} />
    <div class="sd-topbar-spacer" aria-hidden="true"></div>
    <div class="sd-topbar-tools">
      {#if context.config.search.enabled}
        <svelte:component
          this={Search}
          records={context.search}
          loadRecords={context.loadSearch}
          scope={context.searchScope}
          provider={context.config.search.provider}
          buildMode={context.config.build.mode}
          {context}
        />
      {/if}
      <ScopeSwitcher page={context.page} pages={context.pages} locales={context.config.i18n.locales} {context} />
    </div>
    <svelte:component this={Social} {context} />
    <svelte:component this={Toggle} defaultMode={context.config.theme.defaultMode} {context} />
    <svelte:component this={Mobile} items={mobileTree} currentPath={mobileCurrentPath} {themeComponents} {context} />
  </div>
  <button
    class="sd-menu-button"
    type="button"
    aria-label={mobileMenuOpen ? context.t('nav.mobile.close') : context.t('nav.mobile.open')}
    aria-expanded={mobileMenuOpen}
    aria-controls={mobileMenuId}
    on:click={onToggleMobileMenu}
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
