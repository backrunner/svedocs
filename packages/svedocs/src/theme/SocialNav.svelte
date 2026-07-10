<script lang="ts">
  import { linkRel, resolveLocalizedNavItem } from './headless.js';
  import type { SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;
</script>

{#if context.config.theme.social.length > 0}
  <nav class="sd-socialnav" aria-label={context.t('nav.social')} data-theme-component="social-nav">
    {#each context.config.theme.social as item}
      {@const localized = resolveLocalizedNavItem(item, context)}
      <a href={localized.href} rel={linkRel(localized)} target={localized.external ? '_blank' : undefined}>
        {localized.label}
      </a>
    {/each}
  </nav>
{/if}
