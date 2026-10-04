<script lang="ts">
  import type { HTMLLinkAttributes, HTMLMetaAttributes } from 'svelte/elements';
  import type { SvedocsPageAlternate, SvedocsPageMetadata } from '../og/types.js';
  import { createJsonLdScript } from '../og/metadata.js';
  import type { SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;
  export let metadata: SvedocsPageMetadata | undefined = undefined;
  export let alternates: SvedocsPageAlternate[] = [];
  export let title = context.config.site.title;
  export let description = context.config.site.description;
  export let robots: string | undefined = undefined;
  $: jsonLdScripts = metadata ? [metadata.jsonLd, ...metadata.head.jsonLd].map(createJsonLdScript) : [];

  function metaHttpEquiv(value: string | undefined): HTMLMetaAttributes['http-equiv'] {
    return value as HTMLMetaAttributes['http-equiv'];
  }

  function linkAs(value: string | undefined): HTMLLinkAttributes['as'] {
    return value as HTMLLinkAttributes['as'];
  }

  function linkCrossorigin(value: string | undefined): HTMLLinkAttributes['crossorigin'] {
    return value as HTMLLinkAttributes['crossorigin'];
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if robots}
    <meta name="robots" content={robots} />
  {/if}
  {#if metadata?.keywords.length}
    <meta name="keywords" content={metadata.keywords.join(', ')} />
  {/if}
  {#if metadata?.canonical}
    <link rel="canonical" href={metadata.canonical} />
  {/if}
  {#each alternates as alternate}
    <link rel="alternate" hreflang={alternate.lang} href={alternate.href} />
  {/each}
  {#if metadata}
    <meta property="og:title" content={metadata.openGraph.title} />
    <meta property="og:description" content={metadata.openGraph.description} />
    <meta property="og:type" content={metadata.openGraph.type} />
    <meta property="og:site_name" content={metadata.openGraph.siteName} />
    {#if metadata.openGraph.locale}
      <meta property="og:locale" content={metadata.openGraph.locale} />
    {/if}
    {#each metadata.openGraph.alternateLocales ?? [] as locale}
      <meta property="og:locale:alternate" content={locale} />
    {/each}
    {#if metadata.openGraph.url}
      <meta property="og:url" content={metadata.openGraph.url} />
    {/if}
    {#if metadata.openGraph.image}
      <meta property="og:image" content={metadata.openGraph.image} />
      {#if metadata.openGraph.imageAlt}<meta property="og:image:alt" content={metadata.openGraph.imageAlt} />{/if}
      {#if metadata.openGraph.imageWidth}<meta property="og:image:width" content={String(metadata.openGraph.imageWidth)} />{/if}
      {#if metadata.openGraph.imageHeight}<meta property="og:image:height" content={String(metadata.openGraph.imageHeight)} />{/if}
      {#if metadata.openGraph.imageType}<meta property="og:image:type" content={metadata.openGraph.imageType} />{/if}
    {/if}
    {#if metadata.openGraph.type === 'article'}
      {#if metadata.openGraph.author}
        <meta property="article:author" content={metadata.openGraph.author} />
      {/if}
      {#if metadata.openGraph.publishedTime}
        <meta property="article:published_time" content={metadata.openGraph.publishedTime} />
      {/if}
      {#if metadata.openGraph.updatedTime}
        <meta property="article:modified_time" content={metadata.openGraph.updatedTime} />
      {/if}
    {/if}
    <meta name="twitter:card" content={metadata.twitter.card} />
    <meta name="twitter:title" content={metadata.twitter.title} />
    <meta name="twitter:description" content={metadata.twitter.description} />
    {#if metadata.twitter.image}
      <meta name="twitter:image" content={metadata.twitter.image} />
      {#if metadata.twitter.imageAlt}<meta name="twitter:image:alt" content={metadata.twitter.imageAlt} />{/if}
    {/if}
    {#each metadata.head.meta as tag}
      <meta
        name={tag.name}
        property={tag.property}
        http-equiv={metaHttpEquiv(tag.httpEquiv)}
        itemprop={tag.itemprop}
        content={tag.content}
      />
    {/each}
    {#each metadata.head.links as tag}
      <link
        rel={tag.rel}
        href={tag.href}
        hreflang={tag.hreflang}
        type={tag.type}
        media={tag.media}
        title={tag.title}
        sizes={tag.sizes}
        as={linkAs(tag.as)}
        crossorigin={linkCrossorigin(tag.crossorigin)}
      />
    {/each}
    {#each jsonLdScripts as script}
      {@html script}
    {/each}
  {/if}
</svelte:head>
