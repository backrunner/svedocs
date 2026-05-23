<script lang="ts">
  import { onMount } from 'svelte';

  export let defaultMode: 'light' | 'dark' | 'system' = 'system';

  let mode: 'light' | 'dark' = 'light';

  function apply(next: 'light' | 'dark') {
    mode = next;
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem('svedocs-theme', next);
  }

    onMount(() => {
      const current = document.documentElement.dataset.theme;
      if (current === 'dark' || current === 'light') {
        mode = current;
        return;
      }
      const stored = localStorage.getItem('svedocs-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const configured = defaultMode === 'system' ? prefersDark ? 'dark' : 'light' : defaultMode;
      apply(stored === 'dark' || stored === 'light' ? stored : configured);
    });
</script>

<button class="sd-theme-toggle" type="button" aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`} on:click={() => apply(mode === 'dark' ? 'light' : 'dark')}>
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
