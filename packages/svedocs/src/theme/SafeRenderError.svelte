<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsTreeItem } from '../core/types.js';
  import RenderError from './RenderError.svelte';
  import type { SvedocsRenderErrorProps, SvedocsThemeContext } from './types.js';

  export let component: Component<SvedocsRenderErrorProps> | undefined = undefined;
  export let error: unknown = undefined;
  export let reset: (() => void) | undefined = undefined;
  export let title = 'This section could not render';
  export let message = 'Something in this part of the documentation failed while rendering. The rest of the page is still available.';
  export let label = 'Rendering issue';
  export let variant = 'section';
  export let page: SvedocsPage | undefined = undefined;
  export let context: SvedocsThemeContext | undefined = undefined;
  export let tree: SvedocsTreeItem[] = [];

  $: ErrorComponent = component ?? RenderError;
</script>

<svelte:boundary>
  <svelte:component
    this={ErrorComponent}
    {error}
    {reset}
    {title}
    {message}
    {label}
    {variant}
    {page}
    {context}
    {tree}
  />
  {#snippet failed(fallbackError)}
    <RenderError
      error={fallbackError}
      {reset}
      title="Error UI could not render"
      message="A custom error component failed while rendering. The default recovery UI is shown instead."
      label="Error boundary issue"
      variant="section"
      {page}
      {context}
      {tree}
    />
  {/snippet}
</svelte:boundary>
