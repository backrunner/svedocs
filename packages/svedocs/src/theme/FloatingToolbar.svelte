<script lang="ts">
  import { onMount } from 'svelte';
  import type { SvedocsResolvedConfig } from '../core/types.js';

  export let config: SvedocsResolvedConfig;

  let scrolled = false;

  $: aiEnabled = config.ai.enabled;
  $: showBackToTop = scrolled;
  $: visible = aiEnabled || showBackToTop;
  $: mode = aiEnabled ? 'pill' : 'solo';
  $: aiCollapsed = aiEnabled && showBackToTop;

  function openAskAi() {
    window.dispatchEvent(new CustomEvent('svedocs:open-ai'));
  }

  function backToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  onMount(() => {
    function updateScrolled() {
      scrolled = window.scrollY > 240;
    }

    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  });
</script>

{#if visible}
  <div
    class="sd-floating-toolbar"
    role="toolbar"
    aria-label="Page tools"
    data-mode={mode}
    data-scrolled={scrolled}
  >
    {#if aiEnabled}
      <button
        class="sd-floating-tool sd-floating-tool-ai"
        type="button"
        aria-label={config.ai.label}
        title={config.ai.label}
        data-collapsed={aiCollapsed}
        on:click={openAskAi}
      >
        <svg class="sd-floating-tool-glyph" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M5 5h14v10H9l-4 4V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
        <span class="sd-floating-tool-label">{config.ai.label}</span>
      </button>
    {/if}
    {#if showBackToTop}
      <button
        class="sd-floating-tool sd-floating-tool-icon sd-floating-tool-back"
        type="button"
        aria-label="Back to top"
        title="Back to top"
        on:click={backToTop}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 5l-7 7m7-7 7 7M12 6v13" />
        </svg>
      </button>
    {/if}
  </div>
{/if}
