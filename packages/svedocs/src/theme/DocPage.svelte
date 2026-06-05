<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage } from '../core/types.js';
  import Article from './Article.svelte';

  export let page: SvedocsPage;
  export let content: Component | undefined = undefined;
  export let hasDocHeaderSlot: boolean | undefined = undefined;
</script>

<Article {page} {content} {hasDocHeaderSlot}>
  <svelte:fragment slot="doc-header" let:page let:breadcrumbs>
    <slot name="doc-header" {page} {breadcrumbs} />
  </svelte:fragment>
</Article>
