<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { classNames, type SvedocsControlDensity } from './forms.js';

  interface $$Props extends Omit<HTMLTextareaAttributes, 'class' | 'value'> {
    class?: string;
    density?: SvedocsControlDensity;
    invalid?: boolean;
    value?: HTMLTextareaAttributes['value'];
  }

  export let value: HTMLTextareaAttributes['value'] = '';
  export let invalid = false;
  export let density: SvedocsControlDensity = 'md';

  let className = '';

  export { className as class };
</script>

<textarea
  {...$$restProps}
  class={classNames('sd-textarea', className)}
  data-density={density}
  aria-invalid={invalid ? 'true' : undefined}
  bind:value
  on:blur
  on:change
  on:focus
  on:input
  on:keydown
  on:keyup
></textarea>
