<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { classNames, type SvedocsControlDensity } from './forms.js';

  interface $$Props extends Omit<HTMLInputAttributes, 'class' | 'type' | 'value'> {
    class?: string;
    density?: SvedocsControlDensity;
    invalid?: boolean;
    type?: HTMLInputAttributes['type'];
    value?: HTMLInputAttributes['value'];
  }

  export let value: HTMLInputAttributes['value'] = '';
  export let type: HTMLInputAttributes['type'] = 'text';
  export let invalid = false;
  export let density: SvedocsControlDensity = 'md';

  let className = '';

  export { className as class };
</script>

<input
  {...$$restProps}
  class={classNames('sd-input', className)}
  data-density={density}
  aria-invalid={invalid ? 'true' : undefined}
  {type}
  bind:value
  on:blur
  on:change
  on:focus
  on:input
  on:keydown
  on:keyup
/>
