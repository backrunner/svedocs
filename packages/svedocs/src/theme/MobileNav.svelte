<script lang="ts">
  import type { SvedocsTreeItem } from '../core/types.js';
  import SidebarTree from './SidebarTree.svelte';
  import type { SvedocsThemeComponentMap } from './types.js';

  export let items: SvedocsTreeItem[] = [];
  export let currentPath = '';
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  $: Sidebar = themeComponents.Sidebar ?? SidebarTree;
</script>

{#if items.length > 0}
  <nav class="sd-mobile-docnav" aria-label="Documentation" data-theme-component="mobile-nav">
    <svelte:component this={Sidebar} {items} {currentPath} />
  </nav>
{/if}
