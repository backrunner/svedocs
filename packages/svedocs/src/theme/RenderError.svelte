<script lang="ts">
  import type { SvedocsPage, SvedocsTreeItem } from '../core/types.js';
  import type { SvedocsThemeContext } from './types.js';

  export let error: unknown = undefined;
  export let reset: (() => void) | undefined = undefined;
  export let title = 'This section could not render';
  export let message = 'Something in this part of the documentation failed while rendering. The rest of the page is still available.';
  export let label = 'Rendering issue';
  export let variant = 'section';
  export let page: SvedocsPage | undefined = undefined;
  export let context: SvedocsThemeContext | undefined = undefined;
  export let tree: SvedocsTreeItem[] = [];

  $: detail = getErrorMessage(error);
  $: pageHref = page?.routePath ?? context?.page?.routePath;
  $: homeHref = tree.find((item) => item.path)?.path ?? context?.tree.find((item) => item.path)?.path ?? '/docs';

  function getErrorMessage(value: unknown): string {
    if (value instanceof Error) return value.message || value.name;
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'message' in value) {
      const message = (value as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return '';
  }
</script>

<section class="sd-render-error" data-theme-component="render-error" data-variant={variant} role="alert">
  <div class="sd-render-error-mark" aria-hidden="true"></div>
  <div class="sd-render-error-body">
    <p class="sd-render-error-kicker">{label}</p>
    <strong>{title}</strong>
    <p>{message}</p>
    {#if detail}
      <details>
        <summary>Technical details</summary>
        <code>{detail}</code>
      </details>
    {/if}
    <div class="sd-render-error-actions">
      {#if reset}
        <button class="sd-button sd-button-primary" type="button" on:click={reset}>
          <span>Try again</span>
          <span class="sd-button-arrow" aria-hidden="true"></span>
        </button>
      {/if}
      {#if pageHref}
        <a class="sd-button" href={pageHref}>Reload page</a>
      {/if}
      {#if homeHref}
        <a class="sd-button" href={homeHref}>Docs home</a>
      {/if}
    </div>
  </div>
</section>
