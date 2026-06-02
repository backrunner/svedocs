<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { classNames, type SvedocsControlDensity } from './forms.js';

  interface $$Props extends Omit<HTMLInputAttributes, 'checked' | 'class' | 'type'> {
    checked?: boolean;
    class?: string;
    density?: SvedocsControlDensity;
    description?: string;
    indeterminate?: boolean;
    invalid?: boolean;
    label?: string;
  }

  export let checked = false;
  export let indeterminate = false;
  export let invalid = false;
  export let label = '';
  export let description = '';
  export let density: SvedocsControlDensity = 'md';

  let className = '';
  let input: HTMLInputElement | undefined;

  export { className as class };

  $: if (input) input.indeterminate = indeterminate;
</script>

<label class={classNames('sd-checkbox', className)} data-density={density} data-invalid={invalid ? 'true' : undefined}>
  <input
    {...$$restProps}
    bind:this={input}
    type="checkbox"
    aria-invalid={invalid ? 'true' : undefined}
    bind:checked
    on:blur
    on:change
    on:focus
    on:input
    on:keydown
    on:keyup
  />
  <span class="sd-checkbox-box" aria-hidden="true">
    <svg class="sd-checkbox-check" viewBox="0 0 16 16">
      <path d="M3.2 8.2 6.4 11 12.8 4.5" />
    </svg>
    <svg class="sd-checkbox-minus" viewBox="0 0 16 16">
      <path d="M3.5 8h9" />
    </svg>
  </span>
  {#if label || description || $$slots.default}
    <span class="sd-checkbox-copy">
      {#if label}
        <span class="sd-checkbox-label">{label}</span>
      {/if}
      <slot />
      {#if description}
        <span class="sd-checkbox-description">{description}</span>
      {/if}
    </span>
  {/if}
</label>
