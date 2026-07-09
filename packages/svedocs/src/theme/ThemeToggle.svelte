<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createThemeModeController, fallbackTranslate } from './headless.js';
  import type { SvedocsThemeContext } from './types.js';

  export let defaultMode: 'light' | 'dark' | 'system' = 'system';
  export let context: SvedocsThemeContext | undefined = undefined;

  const controller = createThemeModeController(defaultMode);
  let mode: 'light' | 'dark' = 'light';
  let unsubscribeMode: (() => void) | undefined;
  $: t = context?.t ?? fallbackTranslate;
  $: targetMode = mode === 'dark' ? 'light' : 'dark';
  $: targetModeLabel = t(targetMode === 'light' ? 'theme.light' : 'theme.dark');
  $: label = t('theme.switch', { mode: targetModeLabel });

  onMount(() => {
    unsubscribeMode = controller.mode.subscribe((value) => (mode = value));
    return controller.mount();
  });

  onDestroy(() => {
    unsubscribeMode?.();
  });
</script>

<button class="sd-theme-toggle" type="button" aria-label={label} title={label} on:click={controller.toggle}>
  {#if mode === 'dark'}
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.42-1.42M4.92 19.08l1.42-1.42m11.32 0 1.42 1.42M4.92 4.92l1.42 1.42" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  {:else}
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 14.2A7.8 7.8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z" />
    </svg>
  {/if}
</button>
