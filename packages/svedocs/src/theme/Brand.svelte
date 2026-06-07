<script lang="ts">
  import type { SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;
</script>

<a class="sd-brand" href={context.config.theme.brand.href} data-theme-component="brand">
  {#if context.config.theme.brand.logo}
    <img class="sd-brand-logo" src={context.config.theme.brand.logo} alt="" draggable="false" />
  {:else if context.config.theme.brand.mark !== false}
    <span class="sd-brand-mark" aria-hidden="true"></span>
  {/if}
  <span>{context.config.theme.brand.label}</span>
</a>
