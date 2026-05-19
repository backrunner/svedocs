<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createPageTree as createCorePageTree } from '../core/navigation.js';
  import DocPage from './DocPage.svelte';
  import RootLayout from './RootLayout.svelte';
  import SidebarTree from './SidebarTree.svelte';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let content: Component | undefined = undefined;

  let menuOpen = false;
  let activeHeading = page.headings[0]?.id ?? '';
  const sidebarId = `sd-sidebar-${page.id}`;
  $: scopedTree = createCorePageTree(filterPagesForCurrentScope(pages, page));

  onMount(() => {
    const headings = page.headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) activeHeading = visible.target.id;
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] }
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  });

  function handleShellKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && menuOpen) {
      menuOpen = false;
    }
  }

  function filterPagesForCurrentScope(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
    return pages.filter((candidate) => candidate.kind === 'doc'
      && candidate.locale === current.locale
      && candidate.version === current.version);
  }

</script>

<svelte:window on:keydown={handleShellKeydown} />

<RootLayout {config} {page} {pages} {search}>
  <button class="sd-menu-button" type="button" aria-expanded={menuOpen} aria-controls={sidebarId} on:click={() => (menuOpen = !menuOpen)}>
    Menu
  </button>
  <div class:sd-menu-open={menuOpen} class="sd-doc-shell">
    <aside id={sidebarId} class="sd-sidebar" aria-label="Documentation">
      <nav>
        <SidebarTree items={scopedTree.length ? scopedTree : tree} currentPath={page.routePath} />
      </nav>
    </aside>
    <main id="content" class="sd-content">
      <DocPage {page} {content} />
    </main>
    <aside class="sd-toc" aria-label="On this page">
      {#if page.headings.length > 0}
        <div class="sd-toc-title">On this page</div>
        {#each page.headings as heading}
          <a class:sd-active={heading.id === activeHeading} class="sd-toc-link sd-depth-{heading.depth}" href={'#' + heading.id}>
            {heading.text}
          </a>
        {/each}
      {/if}
    </aside>
  </div>
</RootLayout>
