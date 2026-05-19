<script lang="ts">
  import type { SvedocsTreeItem } from '../core/types.js';

  export let items: SvedocsTreeItem[] = [];
  export let currentPath = '';

  function isActive(item: SvedocsTreeItem): boolean {
    return item.path === currentPath;
  }

  function isActiveBranch(item: SvedocsTreeItem): boolean {
    return isActive(item) || Boolean(item.children?.some((child) => isActiveBranch(child)));
  }
</script>

<ul class="sd-sidebar-list">
  {#each items as item}
    <li class:sd-has-children={Boolean(item.children?.length)}>
      {#if item.children?.length}
        <details open={isActiveBranch(item) || item.collapsed !== true}>
          <summary class:sd-active={isActive(item)}>
            {#if item.path}
              <a href={item.path} on:click|stopPropagation>{item.title}</a>
            {:else}
              <span>{item.title}</span>
            {/if}
          </summary>
          <svelte:self items={item.children} {currentPath} />
        </details>
      {:else if item.path}
        <a class:sd-active={isActive(item)} href={item.path}>{item.title}</a>
      {:else}
        <span>{item.title}</span>
      {/if}
    </li>
  {/each}
</ul>
