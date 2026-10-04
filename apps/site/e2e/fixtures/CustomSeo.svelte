<script lang="ts">
  import type { SvedocsSeoProps } from 'svedocs/theme/types';
  let { context, metadata, title }: SvedocsSeoProps = $props();
</script>

<svelte:head>
  <title>Custom SEO: {title}</title>
  <meta name="custom-language" content={context.languageTag} />
  <meta name="custom-canonical" content={metadata?.canonical} />
</svelte:head>
