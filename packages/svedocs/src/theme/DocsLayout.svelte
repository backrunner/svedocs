<script lang="ts">
  import { onMount, tick } from 'svelte';
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

  let activeHeading = page.headings[0]?.id ?? '';
  let tocEl: HTMLElement | null = null;
  let indicatorTop = 0;
  let indicatorHeight = 0;
  let indicatorReady = false;
  let observer: IntersectionObserver | undefined;
  let mounted = false;
  $: scopedTree = createCorePageTree(filterPagesForCurrentScope(pages, page));
  $: navigationTree = scopedTree.length ? scopedTree : tree;

  onMount(() => {
    mounted = true;
    return () => observer?.disconnect();
  });

  $: if (mounted) void attachHeadingObserver(page);

  async function attachHeadingObserver(currentPage: SvedocsPage) {
    observer?.disconnect();
    indicatorReady = false;
    activeHeading = currentPage.headings[0]?.id ?? '';
    await tick();
    const headings = currentPage.headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (headings.length === 0) return;
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) activeHeading = visible.target.id;
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] }
    );
    headings.forEach((heading) => observer!.observe(heading));
  }

  $: if (typeof document !== 'undefined' && tocEl && activeHeading) {
    void updateIndicator(activeHeading);
  }

  async function updateIndicator(id: string) {
    await tick();
    if (!tocEl) return;
    const link = tocEl.querySelector<HTMLElement>(`a.sd-toc-link[href="#${cssEscape(id)}"]`);
    if (!link) return;
    indicatorTop = link.offsetTop;
    indicatorHeight = link.offsetHeight;
    indicatorReady = true;
  }

  function handleTocClick(event: MouseEvent, id: string) {
    activeHeading = id;
  }

  function cssEscape(value: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    return value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  }

  function filterPagesForCurrentScope(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
    return pages.filter((candidate) => candidate.kind === 'doc'
      && candidate.locale === current.locale);
  }

</script>

<RootLayout {config} {page} {pages} {search} mobileTree={navigationTree} mobileCurrentPath={page.routePath}>
  <div class="sd-doc-shell">
    <aside class="sd-sidebar" aria-label="Documentation">
      <nav>
        <SidebarTree items={navigationTree} currentPath={page.routePath} />
      </nav>
    </aside>
    <main id="content" class="sd-content">
      <DocPage {page} {content} />
    </main>
    <aside
      bind:this={tocEl}
      class="sd-toc"
      class:sd-toc-ready={indicatorReady}
      aria-label="On this page"
      style={`--toc-indicator-top:${indicatorTop}px;--toc-indicator-height:${indicatorHeight}px;`}
    >
      {#if page.headings.length > 0}
        <div class="sd-toc-title">On this page</div>
        {#each page.headings as heading}
          <a
            class:sd-active={heading.id === activeHeading}
            class="sd-toc-link sd-depth-{heading.depth}"
            href={'#' + heading.id}
            on:click={(event) => handleTocClick(event, heading.id)}
          >
            {heading.text}
          </a>
        {/each}
      {/if}
    </aside>
  </div>
</RootLayout>
