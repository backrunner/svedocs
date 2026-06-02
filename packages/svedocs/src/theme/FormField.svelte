<script lang="ts">
  import { classNames } from './forms.js';

  interface $$Props {
    class?: string;
    description?: string;
    error?: string;
    for?: string;
    label?: string;
    required?: boolean;
  }

  export let label = '';
  export let description = '';
  export let error = '';
  export let required = false;

  let className = '';
  let forId = '';

  export { className as class, forId as for };
</script>

<div class={classNames('sd-field', className)} data-invalid={error ? 'true' : undefined}>
  {#if label}
    <label class="sd-field-label" for={forId || undefined}>
      <span>{label}</span>
      {#if required}
        <span class="sd-field-required" aria-hidden="true">*</span>
      {/if}
    </label>
  {/if}

  <slot />

  {#if error}
    <p class="sd-field-error">{error}</p>
  {:else if description}
    <p class="sd-field-description">{description}</p>
  {/if}
</div>
