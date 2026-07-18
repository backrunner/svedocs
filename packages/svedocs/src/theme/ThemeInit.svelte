<script lang="ts">
  import { createThemeInitScript } from './headless.js';

  export let defaultMode: 'light' | 'dark' | 'system' = 'system';
  export let languageTag = 'en';
  export let dir: 'ltr' | 'rtl' = 'ltr';

  $: script = createThemeInitScript(defaultMode, languageTag, dir);
</script>

<svelte:head>
  <meta name="color-scheme" content={defaultMode === 'system' ? 'light dark' : defaultMode} />
  {#if script}
    {@html script}
  {/if}
</svelte:head>
