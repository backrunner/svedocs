<script lang="ts">
  import { onMount } from 'svelte';

  export let defaultMode: 'light' | 'dark' | 'system' = 'system';

  let mode: 'light' | 'dark' = 'light';

  function apply(next: 'light' | 'dark') {
    mode = next;
    document.documentElement.dataset.theme = next;
    localStorage.setItem('svedocs-theme', next);
  }

    onMount(() => {
      const stored = localStorage.getItem('svedocs-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const configured = defaultMode === 'system' ? prefersDark ? 'dark' : 'light' : defaultMode;
      apply(stored === 'dark' || stored === 'light' ? stored : configured);
    });
</script>

<button class="sd-theme-toggle" type="button" aria-label="Toggle theme" on:click={() => apply(mode === 'dark' ? 'light' : 'dark')}>
  {mode === 'dark' ? 'Light' : 'Dark'}
</button>
