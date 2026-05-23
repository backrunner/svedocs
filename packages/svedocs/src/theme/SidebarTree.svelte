<script lang="ts">
  import { goto } from '$app/navigation';
  import type { SvedocsTreeItem } from '../core/types.js';

  export let items: SvedocsTreeItem[] = [];
  export let currentPath = '';
  export let depth = 0;

  function isActive(item: SvedocsTreeItem): boolean {
    return item.path === currentPath;
  }

  function isActiveBranch(item: SvedocsTreeItem): boolean {
    return isActive(item) || Boolean(item.children?.some((child) => isActiveBranch(child)));
  }

  function shouldOpen(item: SvedocsTreeItem): boolean {
    if (isActiveBranch(item)) return true;
    return item.collapsed !== true;
  }

  function handleSummaryLinkClick(event: MouseEvent, href: string | undefined) {
    if (!href) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void goto(href, { keepFocus: false });
  }

  $: sections = depth === 0 ? splitIntoSections(items) : null;

  function splitIntoSections(items: SvedocsTreeItem[]): { heading?: SvedocsTreeItem; items: SvedocsTreeItem[] }[] {
    const hasSections = items.some((item) => item.section === true);
    if (!hasSections) return [{ items }];
    const out: { heading?: SvedocsTreeItem; items: SvedocsTreeItem[] }[] = [];
    let current: { heading?: SvedocsTreeItem; items: SvedocsTreeItem[] } = { items: [] };
    for (const item of items) {
      if (item.section === true) {
        if (current.items.length > 0 || current.heading) out.push(current);
        current = { heading: item, items: [] };
      } else {
        current.items.push(item);
      }
    }
    if (current.items.length > 0 || current.heading) out.push(current);
    return out;
  }
</script>

{#if depth === 0 && sections}
  <div class="sd-sidebar-root">
    {#each sections as section, sectionIndex}
      {#if section.heading}
        <div class="sd-sidebar-section-heading" class:sd-first={sectionIndex === 0}>
          {#if section.heading.icon}
            <span class="sd-sidebar-section-icon" aria-hidden="true">{section.heading.icon}</span>
          {/if}
          <span>{section.heading.title}</span>
        </div>
      {/if}
      <ul class="sd-sidebar-list" data-depth={depth}>
        {#each section.items as item}
          {@const hasChildren = Boolean(item.children?.length)}
          {@const active = isActive(item)}
          {@const branchActive = isActiveBranch(item)}
          <li class="sd-sidebar-item" class:sd-has-children={hasChildren} class:sd-branch-active={branchActive}>
            {#if hasChildren}
              <details class="sd-sidebar-group" open={shouldOpen(item)}>
                <summary class="sd-sidebar-summary" class:sd-active={active}>
                  {#if item.icon}
                    <span class="sd-sidebar-icon" aria-hidden="true">{item.icon}</span>
                  {/if}
                  <span class="sd-sidebar-summary-label">
                    {#if item.path}
                      <a class="sd-sidebar-summary-link" href={item.path} on:click={(event) => handleSummaryLinkClick(event, item.path)}>{item.title}</a>
                    {:else}
                      <span>{item.title}</span>
                    {/if}
                  </span>
                  <span class="sd-sidebar-chevron" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
                  </span>
                </summary>
                <div class="sd-sidebar-group-body">
                  <svelte:self items={item.children} {currentPath} depth={depth + 1} />
                </div>
              </details>
            {:else if item.path}
              <a class="sd-sidebar-link" class:sd-active={active} href={item.path}>
                {#if item.icon}
                  <span class="sd-sidebar-icon" aria-hidden="true">{item.icon}</span>
                {/if}
                <span>{item.title}</span>
              </a>
            {:else}
              <span class="sd-sidebar-section-label">{item.title}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/each}
  </div>
{:else}
  <ul class="sd-sidebar-list" data-depth={depth}>
    {#each items as item}
      {@const hasChildren = Boolean(item.children?.length)}
      {@const active = isActive(item)}
      {@const branchActive = isActiveBranch(item)}
      <li class="sd-sidebar-item" class:sd-has-children={hasChildren} class:sd-branch-active={branchActive}>
        {#if hasChildren}
          <details class="sd-sidebar-group" open={shouldOpen(item)}>
            <summary class="sd-sidebar-summary" class:sd-active={active}>
              <span class="sd-sidebar-chevron" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
              </span>
              {#if item.path}
                <a class="sd-sidebar-summary-link" href={item.path} on:click={(event) => handleSummaryLinkClick(event, item.path)}>{item.title}</a>
              {:else}
                <span class="sd-sidebar-summary-text">{item.title}</span>
              {/if}
            </summary>
            <div class="sd-sidebar-group-body">
              <svelte:self items={item.children} {currentPath} depth={depth + 1} />
            </div>
          </details>
        {:else if item.path}
          <a class="sd-sidebar-link" class:sd-active={active} href={item.path}>
            <span>{item.title}</span>
          </a>
        {:else}
          <span class="sd-sidebar-section-label">{item.title}</span>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
