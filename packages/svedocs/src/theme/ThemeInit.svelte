<script lang="ts">
  import { createThemeInitScript } from './headless.js';

  export let defaultMode: 'light' | 'dark' | 'system' = 'system';
  export let languageTag = 'en';
  export let dir: 'ltr' | 'rtl' = 'ltr';

  $: script = createThemeInitScript(defaultMode, languageTag, dir);
</script>

<svelte:head>
  <meta name="color-scheme" content="light dark" />
  {@html script}
</svelte:head>
