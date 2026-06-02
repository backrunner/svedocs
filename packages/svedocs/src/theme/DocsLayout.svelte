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
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let content: Component | undefined = undefined;

  let activeHeading = page.headings[0]?.id ?? '';
  let tocEl: HTMLElement | null = null;
  let indicatorTop = 0;
  let indicatorHeight = 0;
  let indicatorReady = false;
  let headingFrame: number | undefined;
  let stopHeadingTracking: (() => void) | undefined;
  let headingTrackingVersion = 0;
  let mounted = false;
  $: scopedTree = createCorePageTree(filterPagesForCurrentScope(pages, page));
  $: navigationTree = scopedTree.length ? scopedTree : tree;

  onMount(() => {
    mounted = true;
    return () => {
      headingTrackingVersion += 1;
      stopHeadingTracking?.();
      cancelHeadingFrame();
    };
  });

  $: if (mounted) void attachHeadingTracker(page);

  async function attachHeadingTracker(currentPage: SvedocsPage) {
    const version = headingTrackingVersion + 1;
    headingTrackingVersion = version;
    stopHeadingTracking?.();
    stopHeadingTracking = undefined;
    cancelHeadingFrame();
    indicatorReady = false;
    activeHeading = currentPage.headings[0]?.id ?? '';
    await tick();
    if (version !== headingTrackingVersion) return;
    const headings = currentPage.headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (headings.length === 0) return;
    const syncActiveHeading = () => {
      headingFrame = undefined;
      const nextHeading = getActiveHeading(headings);
      if (nextHeading) activeHeading = nextHeading.id;
    };
    const scheduleActiveHeadingSync = () => {
      if (headingFrame !== undefined) return;
      headingFrame = requestAnimationFrame(syncActiveHeading);
    };
    window.addEventListener('scroll', scheduleActiveHeadingSync, { passive: true });
    window.addEventListener('resize', scheduleActiveHeadingSync);
    stopHeadingTracking = () => {
      window.removeEventListener('scroll', scheduleActiveHeadingSync);
      window.removeEventListener('resize', scheduleActiveHeadingSync);
    };
    scheduleActiveHeadingSync();
  }

  $: if (typeof document !== 'undefined' && tocEl && activeHeading) {
    void updateIndicator(activeHeading);
  }

  async function updateIndicator(id: string) {
    await tick();
    if (!tocEl) return;
    const link = tocEl.querySelector<HTMLElement>(`a.sd-toc-link[href="#${cssEscape(id)}"]`);
    if (!link) return;
    const markerHeight = Math.min(24, Math.max(16, link.offsetHeight - 12));
    indicatorTop = link.offsetTop + (link.offsetHeight - markerHeight) / 2;
    indicatorHeight = markerHeight;
    indicatorReady = true;
  }

  function handleTocClick(event: MouseEvent, id: string) {
    activeHeading = id;
  }

  function cssEscape(value: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    return value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  }

  function cancelHeadingFrame() {
    if (headingFrame === undefined) return;
    cancelAnimationFrame(headingFrame);
    headingFrame = undefined;
  }

  function getActiveHeading(headings: HTMLElement[]): HTMLElement | undefined {
    const viewportTop = 80;
    const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
    const snapshots = headings.map((heading) => ({
      element: heading,
      top: heading.getBoundingClientRect().top
    }));
    const visible = snapshots.filter((heading) => heading.top >= viewportTop && heading.top <= viewportBottom);
    if (visible.length > 0) {
      return visible.reduce((lowest, heading) => heading.top > lowest.top ? heading : lowest).element;
    }
    return snapshots.filter((heading) => heading.top < viewportTop).at(-1)?.element ?? snapshots[0]?.element;
  }

  function filterPagesForCurrentScope(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
    return pages.filter((candidate) => candidate.kind === 'doc'
      && candidate.locale === current.locale);
  }

</script>

<RootLayout {config} {page} {pages} {search} {loadSearch} mobileTree={navigationTree} mobileCurrentPath={page.routePath}>
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
