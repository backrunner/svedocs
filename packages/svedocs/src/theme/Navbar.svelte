<script lang="ts">
  import { handleSamePathNavClick, isActiveNavItem, linkRel } from './headless.js';
  import MobileNav from './MobileNav.svelte';
  import ScopeSwitcher from './ScopeSwitcher.svelte';
  import SearchDialog from './SearchDialog.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import type { SvedocsThemeComponentMap, SvedocsThemeContext } from './types.js';
  import type { SvedocsTreeItem } from '../core/types.js';

  export let context: SvedocsThemeContext;
  export let mobileTree: SvedocsTreeItem[] = [];
  export let mobileCurrentPath = '';
  export let mobileMenuId = 'sd-mobile-menu-site';
  export let mobileMenuOpen = false;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};
  export let onToggleMobileMenu: () => void = () => undefined;

  $: Search = themeComponents.Search ?? SearchDialog;
  $: Toggle = themeComponents.ThemeToggle ?? ThemeToggle;
  $: Mobile = themeComponents.MobileNav ?? MobileNav;
</script>

<header class:sd-mobile-menu-open={mobileMenuOpen} class="sd-topbar" data-theme-component="navbar">
  <a class="sd-brand" href={context.config.theme.brand.href}>
    {#if context.config.theme.brand.logo}
      <img class="sd-brand-logo" src={context.config.theme.brand.logo} alt="" draggable="false" />
    {:else if context.config.theme.brand.mark !== false}
      <span class="sd-brand-mark" aria-hidden="true"></span>
    {/if}
    <span>{context.config.theme.brand.label}</span>
  </a>
  <div id={mobileMenuId} class="sd-topbar-menu" class:sd-open={mobileMenuOpen}>
    <nav class="sd-topnav" aria-label="Primary">
      {#each context.config.theme.nav as item}
        {@const active = isActiveNavItem(item, context.activeNavHref)}
        <a
          class:sd-active={active}
          href={item.href}
          rel={linkRel(item)}
          target={item.external ? '_blank' : undefined}
          aria-current={active ? 'page' : undefined}
          on:click={(event) => handleSamePathNavClick(event, item.href, item.external)}
        >
          {item.label}
        </a>
      {/each}
    </nav>
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
        />
      {/if}
      <ScopeSwitcher page={context.page} pages={context.pages} locales={context.config.i18n.locales} />
    </div>
    {#if context.config.theme.social.length > 0}
      <nav class="sd-socialnav" aria-label="Social links">
        {#each context.config.theme.social as item}
          <a href={item.href} rel={linkRel(item)} target={item.external ? '_blank' : undefined}>
            {item.label}
          </a>
        {/each}
      </nav>
    {/if}
    <svelte:component this={Toggle} defaultMode={context.config.theme.defaultMode} />
    <svelte:component this={Mobile} items={mobileTree} currentPath={mobileCurrentPath} {themeComponents} />
  </div>
  <button
    class="sd-menu-button"
    type="button"
    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
