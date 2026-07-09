<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { SvedocsResolvedConfig } from '../core/types.js';
  import { createPageToolsController, fallbackTranslate } from './headless.js';
  import type { SvedocsPageToolsController, SvedocsThemeContext } from './types.js';

  export let config: SvedocsResolvedConfig;
  export let controller: SvedocsPageToolsController | undefined = undefined;
  export let context: SvedocsThemeContext | undefined = undefined;

  const internalController = createPageToolsController(config);
  let activeController: SvedocsPageToolsController = internalController;
  let visible = false;
  let scrolled = false;
  let mode: 'pill' | 'solo' = config.ai.enabled ? 'pill' : 'solo';
  let aiCollapsed = false;
  let boundController: SvedocsPageToolsController | undefined;
  let unsubscribeController: (() => void) | undefined;

  $: activeController = controller ?? internalController;
  $: aiEnabled = config.ai.enabled;
  $: t = context?.t ?? fallbackTranslate;
  $: askLabel = context ? t('ask.label') : config.ai.label;
  $: bindController(activeController);

  onMount(() => activeController.mount());

  onDestroy(() => {
    unsubscribeController?.();
  });

  function bindController(nextController: SvedocsPageToolsController): void {
    if (boundController === nextController) return;
    unsubscribeController?.();
    boundController = nextController;
    const unsubscribers = [
      nextController.visible.subscribe((value) => (visible = value)),
      nextController.scrolled.subscribe((value) => (scrolled = value)),
      nextController.mode.subscribe((value) => (mode = value)),
      nextController.aiCollapsed.subscribe((value) => (aiCollapsed = value))
    ];
    unsubscribeController = () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }
</script>

{#if visible}
  <div
    class="sd-floating-toolbar"
    role="toolbar"
    aria-label={t('tools.label')}
    data-mode={mode}
    data-scrolled={scrolled}
    data-theme-component="page-tools"
  >
    {#if aiEnabled}
      <button
        class="sd-floating-tool sd-floating-tool-ai"
        type="button"
        aria-label={askLabel}
        title={askLabel}
        data-collapsed={aiCollapsed}
        on:click={activeController.openAskAi}
      >
        <svg class="sd-floating-tool-glyph" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M5 5h14v10H9l-4 4V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
        <span class="sd-floating-tool-label">{askLabel}</span>
      </button>
    {/if}
    {#if scrolled}
      <button
        class="sd-floating-tool sd-floating-tool-icon sd-floating-tool-back"
        type="button"
        aria-label={t('tools.backToTop')}
        title={t('tools.backToTop')}
        on:click={activeController.backToTop}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 5l-7 7m7-7 7 7M12 6v13" />
        </svg>
      </button>
    {/if}
  </div>
{/if}
