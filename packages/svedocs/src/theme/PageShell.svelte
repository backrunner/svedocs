<script lang="ts">
  import type { SvedocsPage } from '../core/types.js';
  import type { SvedocsContentComponent, SvedocsPageShellAction, SvedocsPageShellVariant } from './types.js';
  import SafeRenderError from './SafeRenderError.svelte';
  import type { SvedocsThemeComponentMap, SvedocsThemeContext } from './types.js';

  export let page: SvedocsPage | undefined = undefined;
  export let variant: SvedocsPageShellVariant = 'page';
  export let title = '';
  export let description = '';
  export let kicker = '';
  export let content: SvedocsContentComponent = undefined;
  export let html = '';
  export let status: number | undefined = undefined;
  export let path = '';
  export let actions: SvedocsPageShellAction[] = [];
  export let context: SvedocsThemeContext | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  $: resolvedTitle = title || page?.title || '';
  $: resolvedDescription = description || page?.description || '';
  $: resolvedKicker = kicker;
  $: ErrorComponent = SafeRenderError;
</script>

{#if variant === 'error'}
  <main id="content" class="sd-error-page" data-theme-component="page-shell" data-variant="error">
    <section class="sd-error-panel">
      {#if status}
        <p class="sd-kicker">
          <span class="sd-kicker-mark" aria-hidden="true"></span>
          Error {status}
        </p>
      {/if}
      <h1>{resolvedTitle}</h1>
      {#if resolvedDescription}
        <p>{resolvedDescription}</p>
      {/if}
      {#if path}
        <code>{path}</code>
      {/if}
      {#if actions.length > 0}
        <div class="sd-error-actions">
          {#each actions as action}
            <a
              class:sd-button-primary={action.primary}
              class="sd-button"
              href={action.href}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noreferrer' : undefined}
            >
              <span>{action.label}</span>
              {#if action.primary}
                <span class="sd-button-arrow" aria-hidden="true"></span>
              {/if}
            </a>
          {/each}
        </div>
      {/if}
    </section>
  </main>
{:else}
  <main id="content" class="sd-page" data-theme-component="page-shell" data-variant="page">
    <section class="sd-page-hero">
      {#if resolvedKicker}
        <p class="sd-kicker">{resolvedKicker}</p>
      {/if}
      <h1>{resolvedTitle}</h1>
      {#if resolvedDescription}
        <p>{resolvedDescription}</p>
      {/if}
    </section>
    <section class="sd-prose">
      <svelte:boundary>
        {#if content}
          <svelte:component this={content} />
        {:else}
          {@html html}
        {/if}
        {#snippet failed(error, reset)}
          <svelte:component
            this={ErrorComponent} component={themeComponents.RenderError}
            {error}
            {reset}
            {page}
            {context}
            variant="content"
            label="Page rendering issue"
            title="This page could not render"
            message="The page content failed while rendering. You can retry this section or reload the page."
          />
        {/snippet}
      </svelte:boundary>
    </section>
  </main>
{/if}
