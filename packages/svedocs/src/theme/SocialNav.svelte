<script lang="ts">
  import { linkRel } from './headless.js';
  import type { SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;
</script>

{#if context.config.theme.social.length > 0}
  <nav class="sd-socialnav" aria-label="Social links" data-theme-component="social-nav">
    {#each context.config.theme.social as item}
      <a href={item.href} rel={linkRel(item)} target={item.external ? '_blank' : undefined}>
        {item.label}
      </a>
    {/each}
  </nav>
{/if}
