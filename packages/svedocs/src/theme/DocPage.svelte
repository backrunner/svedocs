<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { SvedocsPage } from '../core/types.js';

  export let page: SvedocsPage;
  export let content: Component | undefined = undefined;
  $: breadcrumbs = createBreadcrumbs(page);
  $: kind = page.kind === 'doc' ? 'Documentation' : 'Page';
  $: eyebrow = breadcrumbs.length > 0 ? breadcrumbs : [{ label: kind, path: page.kind === 'doc' ? '/docs' : '/' }];

  const copyIconSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h9v14H9zM6 8v12h10"/></svg>';
  const checkIconSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"/></svg>';

  onMount(() => {
    const root = document.querySelector<HTMLElement>('.sd-prose');
    if (!root) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('button.sd-code-copy');
      if (!button) return;
      event.preventDefault();
      const block = button.closest<HTMLElement>('.sd-code');
      if (!block) return;
      const source = block.dataset.copy
        ?? block.querySelector<HTMLElement>('code[data-copy]')?.dataset.copy
        ?? block.querySelector('code')?.textContent
        ?? block.textContent
        ?? '';
      void copyToClipboard(button, source);
    }
    root.addEventListener('click', handleClick);
    return () => root.removeEventListener('click', handleClick);
  });

  async function copyToClipboard(button: HTMLButtonElement, source: string) {
    try {
      await navigator.clipboard.writeText(source.trim());
      button.dataset.state = 'copied';
      button.innerHTML = checkIconSvg;
      button.setAttribute('aria-label', 'Copied');
      window.setTimeout(() => {
        button.dataset.state = 'idle';
        button.innerHTML = copyIconSvg;
        button.setAttribute('aria-label', 'Copy code');
      }, 1600);
    } catch {
      button.dataset.state = 'error';
    }
  }

  function createBreadcrumbs(page: SvedocsPage) {
    const segments = page.routePath.split('/').filter(Boolean);
    const parentSegments = segments.slice(0, -1);
    return parentSegments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return { label: titleFromSegment(segment), path };
    });
  }

  function titleFromSegment(segment: string): string {
    return segment
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
</script>

<article class="sd-doc">
  <span class="sd-doc-corner" data-corner="tl" aria-hidden="true"></span>
  <span class="sd-doc-corner" data-corner="tr" aria-hidden="true"></span>
  <header class="sd-doc-header">
    <nav class="sd-doc-eyebrow" aria-label="Breadcrumb">
      <span class="sd-doc-eyebrow-mark" aria-hidden="true"></span>
      {#each eyebrow as item, i}
        {#if i > 0}<span class="sd-doc-eyebrow-sep" aria-hidden="true">/</span>{/if}
        <a href={item.path}>{item.label}</a>
      {/each}
    </nav>
    <h1>{page.title}</h1>
    {#if page.description}
      <p class="sd-doc-lede">{page.description}</p>
    {/if}
  </header>
  <div class="sd-prose">
    {#if content}
      <svelte:component this={content} />
    {:else}
      {@html page.html}
    {/if}
  </div>
  <footer class="sd-doc-footer">
    <div class="sd-doc-meta">
      {#if page.lastUpdated}
        <span>Updated {new Date(page.lastUpdated).toLocaleDateString()}</span>
      {/if}
      {#if page.editUrl}
        <a href={page.editUrl}>Edit this page</a>
      {/if}
    </div>
    {#if page.prev}
      <a class="sd-prev-next" data-direction="prev" href={page.prev.path}>
        <span><i aria-hidden="true"></i>Previous</span>
        <strong>{page.prev.title}</strong>
        <em class="sd-prev-next-arrow" aria-hidden="true">←</em>
      </a>
    {/if}
    {#if page.next}
      <a class="sd-prev-next" data-direction="next" href={page.next.path}>
        <span>Next<i aria-hidden="true"></i></span>
        <strong>{page.next.title}</strong>
        <em class="sd-prev-next-arrow" aria-hidden="true">→</em>
      </a>
    {/if}
  </footer>
</article>
