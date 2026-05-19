<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig } from 'svedocs/core';
  import { RootLayout } from 'svedocs/theme';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let config: SvedocsResolvedConfig;
  export let content: Component | undefined = undefined;
</script>

<RootLayout {config} {page} {pages}>
  <main id="content" class="sd-page sd-feature-page">
    <section class="sd-page-hero">
      <p class="sd-kicker">Custom layout</p>
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
