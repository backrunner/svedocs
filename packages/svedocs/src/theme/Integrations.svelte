<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { dev } from '$app/environment';
  import { tick } from 'svelte';
  import type { SvedocsResolvedConfig } from '../core/types.js';
  import { trackIntegrationPage } from '../integrations/browser.js';

  export let config: SvedocsResolvedConfig;

  afterNavigate(() => {
    void tick().then(() => trackIntegrationPage(config.integrations, document.title, dev));
  });
</script>
