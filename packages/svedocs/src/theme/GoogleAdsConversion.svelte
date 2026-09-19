<script lang="ts">
  import { dev } from '$app/environment';
  import { onMount } from 'svelte';
  import type { SvedocsResolvedConfig } from '../core/types.js';
  import { trackGoogleAdsConversion } from '../integrations/browser.js';

  export let config: SvedocsResolvedConfig;
  /** Name in integrations.googleAds.conversions. Fires once when mounted. */
  export let name: string;
  export let transactionId: string | undefined = undefined;

  onMount(() => trackGoogleAdsConversion(config.integrations, name, dev, transactionId));
</script>
