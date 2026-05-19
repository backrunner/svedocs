<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord } from '../core/types.js';
  import RootLayout from './RootLayout.svelte';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let content: Component | undefined = undefined;

  const cells = Array.from({ length: 96 }, (_, index) => index);
  $: docs = pages.filter((item) => item.kind === 'doc').slice(0, 4);
  $: primaryDoc = docs[0];
  $: secondaryDoc = docs.find((doc) => /configuration|config/i.test(doc.routePath)) ?? docs[1];
  $: primaryAction = config.theme.home.primaryAction ?? (
    primaryDoc ? { label: 'Read docs', href: primaryDoc.routePath } : { label: 'Read docs', href: '/docs' }
  );
  $: secondaryAction = config.theme.home.secondaryAction ?? (
    secondaryDoc ? { label: secondaryDoc.title, href: secondaryDoc.routePath } : undefined
  );
</script>

  <RootLayout {config} {page} {pages} {search}>
  <main id="content" class="sd-home">
    <section class="sd-home-hero">
      <div class="sd-home-copy">
        <p class="sd-kicker">{config.theme.home.kicker}</p>
        <h1>{page.title}</h1>
        {#if page.description}
          <p>{page.description}</p>
        {/if}
        <div class="sd-actions">
          <a class="sd-button sd-button-primary" href={primaryAction.href}>{primaryAction.label}</a>
          {#if secondaryAction}
            <a class="sd-button" href={secondaryAction.href}>{secondaryAction.label}</a>
          {/if}
        </div>
      </div>
      {#if config.theme.home.visual.type === 'image' && config.theme.home.visual.src}
        <img class="sd-home-visual" src={config.theme.home.visual.src} alt={config.theme.home.visual.alt} />
      {:else}
        <div class="sd-pixel-stage" aria-hidden="true">
          {#each cells as cell}
            <span style={`--i:${cell}; --x:${cell % 12}; --y:${Math.floor(cell / 12)}`}></span>
          {/each}
        </div>
      {/if}
    </section>
    <section class="sd-home-grid" aria-label="Documentation entry points">
      {#each docs as doc}
        <a href={doc.routePath}>
          <span>{doc.kind}</span>
          <strong>{doc.title}</strong>
          <small>{doc.description ?? doc.plainText.slice(0, 88)}</small>
        </a>
      {/each}
    </section>
    <section class="sd-prose sd-home-body">
      {#if content}
        <svelte:component this={content} />
      {:else}
        {@html page.html}
      {/if}
    </section>
  </main>
</RootLayout>
