<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { SvedocsPage } from '../core/types.js';

  export let page: SvedocsPage;
  export let content: Component | undefined = undefined;
  $: breadcrumbs = createBreadcrumbs(page);
  $: versionNotice = createVersionNotice(page);

  onMount(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('.sd-prose .sd-code'));
    for (const block of blocks) {
      if (block.querySelector('.sd-copy-code')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sd-copy-code';
      button.textContent = 'Copy';
      button.addEventListener('click', async () => {
        const code = block.dataset.copy ?? block.querySelector('code')?.textContent ?? block.textContent ?? '';
        await navigator.clipboard.writeText(code.replace(/^Copy/, '').trim());
        button.textContent = 'Copied';
        window.setTimeout(() => {
          button.textContent = 'Copy';
        }, 1400);
      });
      const title = block.dataset.title || block.dataset.language || 'Code';
      const meta = [
        block.dataset.addedLines ? `+${block.dataset.addedLines}` : '',
        block.dataset.removedLines ? `-${block.dataset.removedLines}` : '',
        block.dataset.language && block.dataset.language !== title ? block.dataset.language : ''
      ].filter(Boolean).join(' ');
      const toolbar = document.createElement('div');
      toolbar.className = 'sd-code-toolbar';
      const label = document.createElement('span');
      label.textContent = title;
      toolbar.append(label);
      if (meta) {
        const small = document.createElement('small');
        small.textContent = meta;
        toolbar.append(small);
      }
      toolbar.append(button);
      block.prepend(toolbar);
    }
  });

  function createBreadcrumbs(page: SvedocsPage) {
    const segments = page.routePath.split('/').filter(Boolean);
    const items = segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const label = index === segments.length - 1 ? page.title : titleFromSegment(segment);
      return { label, path, current: index === segments.length - 1 };
    });
    return items.length > 0 ? items : [{ label: page.title, path: page.routePath, current: true }];
  }

  function createVersionNotice(page: SvedocsPage): { tone: string; title: string; body: string } | undefined {
    if (!page.version || !page.versionStatus || page.versionStatus === 'current' || page.versionStatus === 'next') return undefined;
    const label = page.versionLabel ?? page.version;
    const status = page.versionStatus ?? 'deprecated';
    return {
      tone: status,
      title: `${label} is ${status}`,
      body: page.versionBanner ?? defaultVersionBanner(label, status)
    };
  }

  function defaultVersionBanner(label: string, status: string): string {
    if (status === 'archived') {
      return `${label} is kept for historical reference and may no longer match the current API.`;
    }
    return `${label} is no longer the recommended documentation version. Use the current version when possible.`;
  }

  function titleFromSegment(segment: string): string {
    return segment
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
</script>

<article class="sd-doc">
  <nav class="sd-breadcrumb" aria-label="Breadcrumb">
    {#each breadcrumbs as item}
      {#if item.current}
        <span aria-current="page">{item.label}</span>
      {:else}
        <a href={item.path}>{item.label}</a>
      {/if}
    {/each}
  </nav>
  <header class="sd-doc-header">
    <p class="sd-kicker">{page.kind === 'doc' ? 'Documentation' : 'Page'}</p>
    <h1>{page.title}</h1>
    {#if page.description}
      <p>{page.description}</p>
    {/if}
  </header>
  {#if versionNotice}
    <aside class="sd-version-banner" data-tone={versionNotice.tone}>
      <strong>{versionNotice.title}</strong>
      <p>{versionNotice.body}</p>
    </aside>
  {/if}
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
      <a class="sd-prev-next" href={page.prev.path}>
        <span>Previous</span>
        {page.prev.title}
      </a>
    {/if}
    {#if page.next}
      <a class="sd-prev-next" href={page.next.path}>
        <span>Next</span>
        {page.next.title}
      </a>
    {/if}
  </footer>
</article>
