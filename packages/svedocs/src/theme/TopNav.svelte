<script lang="ts">
  import { handleSamePathNavClick, isActiveNavItem, linkRel } from './headless.js';
  import type { SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;
</script>

<nav class="sd-topnav" aria-label="Primary" data-theme-component="top-nav">
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
