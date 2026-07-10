<script lang="ts">
  import { resolveLocalizedHref, resolveLocalizedText } from './headless.js';
  import type { SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;

  $: brand = context.config.theme.brand;
  $: href = resolveLocalizedHref(brand.href, context);
  $: label = resolveLocalizedText(brand.label, brand.labelKey, context);
</script>

<a class="sd-brand" {href} data-theme-component="brand">
  {#if brand.logo}
    <img class="sd-brand-logo" src={brand.logo} alt="" draggable="false" />
  {:else if brand.mark !== false}
    <span class="sd-brand-mark" aria-hidden="true"></span>
  {/if}
  <span>{label}</span>
</a>
