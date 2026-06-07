<script lang="ts">
  import FooterLinks from './FooterLinks.svelte';
  import type { SvedocsThemeComponentMap } from './types.js';
  import type { SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  $: footer = context.config.theme.footer;
  $: Links = themeComponents.FooterLinks ?? FooterLinks;
</script>

{#if footer !== false && !context.isDocsPage}
  <footer class="sd-footer" data-theme-component="footer">
    <span>{footer.text}</span>
    <svelte:component this={Links} {context} />
  </footer>
{/if}
