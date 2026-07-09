<script lang="ts">
  import type { SvedocsTreeItem } from '../core/types.js';
  import { fallbackTranslate } from './headless.js';
  import SidebarTree from './SidebarTree.svelte';
  import type { SvedocsThemeComponentMap, SvedocsThemeContext } from './types.js';

  export let items: SvedocsTreeItem[] = [];
  export let currentPath = '';
  export let context: SvedocsThemeContext | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  $: Sidebar = themeComponents.Sidebar ?? SidebarTree;
  $: t = context?.t ?? fallbackTranslate;
</script>

{#if items.length > 0}
  <nav class="sd-mobile-docnav" aria-label={t('nav.documentation')} data-theme-component="mobile-nav">
    <svelte:component this={Sidebar} {items} {currentPath} />
  </nav>
{/if}
