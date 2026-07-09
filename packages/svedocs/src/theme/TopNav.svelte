<script lang="ts">
  import { handleSamePathNavClick, isActiveNavItem, linkRel, resolveLocalizedNavItem } from './headless.js';
  import type { SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;
</script>

<nav class="sd-topnav" aria-label={context.t('nav.primary')} data-theme-component="top-nav">
  {#each context.config.theme.nav as item}
    {@const localized = resolveLocalizedNavItem(item, context)}
    {@const active = isActiveNavItem(localized, context.activeNavHref)}
    <a
      class:sd-active={active}
      href={localized.href}
      rel={linkRel(localized)}
      target={localized.external ? '_blank' : undefined}
      aria-current={active ? 'page' : undefined}
      on:click={(event) => handleSamePathNavClick(event, localized.href, localized.external)}
    >
      {localized.label}
    </a>
  {/each}
</nav>
