<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsTreeItem } from '../core/types.js';
  import { fallbackTranslate } from './headless.js';
  import RenderError from './RenderError.svelte';
  import type { SvedocsRenderErrorProps, SvedocsThemeContext } from './types.js';

  export let component: Component<SvedocsRenderErrorProps> | undefined = undefined;
  export let error: unknown = undefined;
  export let reset: (() => void) | undefined = undefined;
  export let title: string | undefined = undefined;
  export let message: string | undefined = undefined;
  export let label: string | undefined = undefined;
  export let variant = 'section';
  export let page: SvedocsPage | undefined = undefined;
  export let context: SvedocsThemeContext | undefined = undefined;
  export let tree: SvedocsTreeItem[] = [];

  $: ErrorComponent = component ?? RenderError;
  $: t = context?.t ?? fallbackTranslate;
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
      title={t('render.errorUi.title')}
      message={t('render.errorUi.message')}
      label={t('render.errorUi.label')}
      variant="section"
      {page}
      {context}
      {tree}
    />
  {/snippet}
</svelte:boundary>
