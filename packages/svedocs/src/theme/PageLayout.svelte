<script lang="ts">
  import type { Component } from 'svelte';
    import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord } from '../core/types.js';
    import RootLayout from './RootLayout.svelte';

    export let page: SvedocsPage;
    export let pages: SvedocsPage[] = [];
    export let search: SvedocsSearchRecord[] = [];
    export let config: SvedocsResolvedConfig;
    export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
    export let content: Component | undefined = undefined;
    export let hasBackgroundSlot: boolean | undefined = undefined;
    $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
</script>

<RootLayout {config} {page} {pages} {search} {loadSearch} hasBackgroundSlot={showBackgroundSlot}>
  <svelte:fragment slot="background">
    <slot name="background" />
  </svelte:fragment>
  <main id="content" class="sd-page">
    <section class="sd-page-hero">
      <p class="sd-kicker">{config.site.name}</p>
      <h1>{page.title}</h1>
      {#if page.description}
        <p>{page.description}</p>
      {/if}
    </section>
    <section class="sd-prose">
      {#if content}
        <svelte:component this={content} />
      {:else}
        {@html page.html}
      {/if}
    </section>
  </main>
</RootLayout>
