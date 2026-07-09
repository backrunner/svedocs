<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { SvedocsPage } from '../core/types.js';
  import { createTocController, fallbackTranslate } from './headless.js';
  import type { SvedocsThemeContext, SvedocsTocController } from './types.js';

  export let page: SvedocsPage;
  export let controller: SvedocsTocController | undefined = undefined;
  export let context: SvedocsThemeContext | undefined = undefined;

  const internalController = createTocController({ page });
  let activeController: SvedocsTocController = internalController;
  let tocEl: HTMLElement | null = null;
  let activeHeading = page.headings[0]?.id ?? '';
  let indicatorTop = 0;
  let indicatorHeight = 0;
  let indicatorReady = false;
  let boundController: SvedocsTocController | undefined;
  let unsubscribeController: (() => void) | undefined;

  $: activeController = controller ?? internalController;
  $: t = context?.t ?? fallbackTranslate;
  $: activeController.setPage(page);
  $: activeController.setContainer(tocEl);
  $: bindController(activeController);

  onMount(() => {
    if (controller) return;
    return internalController.mount();
  });

  onDestroy(() => {
    unsubscribeController?.();
  });

  function bindController(nextController: SvedocsTocController): void {
    if (boundController === nextController) return;
    unsubscribeController?.();
    boundController = nextController;
    const unsubscribers = [
      nextController.activeHeading.subscribe((value) => (activeHeading = value)),
      nextController.indicatorTop.subscribe((value) => (indicatorTop = value)),
      nextController.indicatorHeight.subscribe((value) => (indicatorHeight = value)),
      nextController.indicatorReady.subscribe((value) => (indicatorReady = value))
    ];
    unsubscribeController = () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }
</script>

<aside
  bind:this={tocEl}
  class="sd-toc"
  class:sd-toc-ready={indicatorReady}
  aria-label={t('toc.label')}
  style={`--toc-indicator-top:${indicatorTop}px;--toc-indicator-height:${indicatorHeight}px;`}
  data-theme-component="toc"
>
  {#if page.headings.length > 0}
    <div class="sd-toc-title">{t('toc.label')}</div>
    {#each page.headings as heading}
      <a
        class:sd-active={heading.id === activeHeading}
        class="sd-toc-link sd-depth-{heading.depth}"
        href={'#' + heading.id}
        on:click={() => activeController.activate(heading.id)}
      >
        {heading.text}
      </a>
    {/each}
  {/if}
</aside>
