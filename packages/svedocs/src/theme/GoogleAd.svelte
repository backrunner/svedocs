<script lang="ts">
  import { dev } from '$app/environment';
  import { onMount } from 'svelte';
  import type { SvedocsResolvedConfig } from '../core/types.js';
  import { canLoadIntegrations, loadGoogleAdsense, requestGoogleAd } from '../integrations/browser.js';

  export let config: SvedocsResolvedConfig;
  /** Name in integrations.googleAdsense.slots. */
  export let name: string;
  /** Change this on navigation to create a new ad element. */
  export let routeKey = '';
  export let label = 'Advertisement';

  let mounted = false;
  $: adsense = config.integrations.googleAdsense;
  $: ad = adsense && Object.hasOwn(adsense.slots, name) && adsense.slots[name];
  $: enabled = mounted && canLoadIntegrations(config.integrations, dev);
  onMount(() => { mounted = true; });

  function initialize(element: HTMLElement) {
    let active = true;
    let ready = false;
    const request = () => {
      if (active && ready && element.getBoundingClientRect().width > 0) requestGoogleAd(element);
    };
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(request);
    resize?.observe(element);
    void loadGoogleAdsense(config.integrations, dev).then((loaded) => { ready = loaded; request(); }).catch(() => {});
    return { destroy() { active = false; resize?.disconnect(); } };
  }
</script>

{#if enabled && adsense && ad}
  {#key `${adsense.client}:${ad.slot}:${routeKey}`}
    <aside class="sd-google-ad" aria-label={label} style:min-height={`${ad.minHeight ?? 120}px`}>
      <ins
        use:initialize
        class="adsbygoogle"
        style="display:block"
        data-ad-client={adsense.client}
        data-ad-slot={ad.slot}
        data-ad-format={ad.format ?? 'auto'}
        data-full-width-responsive={String(ad.responsive ?? true)}
      ></ins>
    </aside>
  {/key}
{/if}
