<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { SvedocsPage } from '../core/types.js';
  import { copyCodeToClipboard, fallbackTranslate } from './headless.js';
  import SafeRenderError from './SafeRenderError.svelte';
  import type { SvedocsThemeComponentMap, SvedocsThemeContext } from './types.js';

  export let page: SvedocsPage;
  export let content: Component | undefined = undefined;
  export let context: SvedocsThemeContext | undefined = undefined;
  export let hasDocHeaderSlot: boolean | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  $: ErrorComponent = SafeRenderError;
  $: t = context?.t ?? fallbackTranslate;
  $: breadcrumbs = createBreadcrumbs(page, context);
  $: kind = page.kind === 'doc' ? t('article.kind.doc') : t('article.kind.page');
  $: eyebrow = breadcrumbs.length > 0 ? breadcrumbs : [{ label: kind, path: page.kind === 'doc' ? findDocsRoot(page, context) : '/' }];
  $: showDocHeaderSlot = hasDocHeaderSlot ?? Boolean($$slots['doc-header']);

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
      void copyCodeToClipboard(button, source, t('code.copied'), button.getAttribute('aria-label') ?? t('code.copy'));
    }
    root.addEventListener('click', handleClick);
    return () => root.removeEventListener('click', handleClick);
  });

  function createBreadcrumbs(page: SvedocsPage, context: SvedocsThemeContext | undefined) {
    if (page.kind !== 'doc') return [];
    const docsRoot = findDocsRoot(page, context);
    if (page.routePath === docsRoot) return [];
    const segments = page.routePath.split('/').filter(Boolean);
    const rootLength = docsRoot.split('/').filter(Boolean).length;
    const breadcrumbs = [{ label: t('nav.docs'), path: docsRoot }];
    for (let length = rootLength + 1; length < segments.length; length += 1) {
      const path = `/${segments.slice(0, length).join('/')}`;
      const target = context?.pages.find((candidate) => candidate.routePath === path);
      breadcrumbs.push({ label: target?.navTitle ?? target?.title ?? titleFromSegment(segments[length - 1] ?? ''), path });
    }
    return breadcrumbs;
  }

  function titleFromSegment(segment: string): string {
    return segment
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function findDocsRoot(page: SvedocsPage, context: SvedocsThemeContext | undefined): string {
    const translatedRoot = context?.pages.find((candidate) => (
      candidate.kind === 'doc'
      && candidate.scopePath === '/docs'
      && candidate.locale === page.locale
    ));
    if (translatedRoot) return translatedRoot.routePath;
    const suffix = page.scopePath === '/docs' ? '' : page.scopePath.slice('/docs'.length);
    if (suffix && page.routePath.endsWith(suffix)) {
      return page.routePath.slice(0, -suffix.length) || '/docs';
    }
    return page.scopePath === '/docs' ? page.routePath : '/docs';
  }
</script>

<article class="sd-doc" data-theme-component="article" data-site={context?.config.site.name}>
  <span class="sd-doc-corner" data-corner="tl" aria-hidden="true"></span>
  <span class="sd-doc-corner" data-corner="tr" aria-hidden="true"></span>
  {#if showDocHeaderSlot}
    <slot name="doc-header" {page} breadcrumbs={eyebrow} />
  {:else}
    <header class="sd-doc-header">
      <nav class="sd-doc-eyebrow" aria-label={t('article.breadcrumb')}>
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
  {/if}
  <div class="sd-prose">
    <svelte:boundary>
      {#if content}
        <svelte:component this={content} />
      {:else}
        {@html page.html}
      {/if}
      {#snippet failed(error, reset)}
        <svelte:component
          this={ErrorComponent} component={themeComponents.RenderError}
          {error}
          {reset}
          {page}
          {context}
          variant="content"
          label={t('render.article.label')}
          title={t('render.article.title')}
          message={t('render.article.message')}
        />
      {/snippet}
    </svelte:boundary>
  </div>
  <footer class="sd-doc-footer">
    <div class="sd-doc-meta">
      {#if page.lastUpdated}
        <span>{t('article.updated', { date: new Date(page.lastUpdated).toLocaleDateString(context?.languageTag) })}</span>
      {/if}
      {#if page.editUrl}
        <a href={page.editUrl}>{t('article.edit')}</a>
      {/if}
    </div>
    {#if page.prev}
      <a class="sd-prev-next" data-direction="prev" href={page.prev.path}>
        <span><i aria-hidden="true"></i>{t('article.previous')}</span>
        <strong>{page.prev.title}</strong>
        <em class="sd-prev-next-arrow" aria-hidden="true">←</em>
      </a>
    {/if}
    {#if page.next}
      <a class="sd-prev-next" data-direction="next" href={page.next.path}>
        <span>{t('article.next')}<i aria-hidden="true"></i></span>
        <strong>{page.next.title}</strong>
        <em class="sd-prev-next-arrow" aria-hidden="true">→</em>
      </a>
    {/if}
  </footer>
</article>
