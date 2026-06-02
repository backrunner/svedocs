<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import { classNames, type SvedocsControlDensity } from './forms.js';

  interface $$Props extends Omit<HTMLSelectAttributes, 'class' | 'value'> {
    class?: string;
    density?: SvedocsControlDensity;
    invalid?: boolean;
    value?: HTMLSelectAttributes['value'];
  }

  export let value: HTMLSelectAttributes['value'] = '';
  export let invalid = false;
  export let density: SvedocsControlDensity = 'md';

  let className = '';

  export { className as class };
</script>

<span class={classNames('sd-select', className)} data-density={density}>
  <select
    {...$$restProps}
    class="sd-select-control"
    aria-invalid={invalid ? 'true' : undefined}
    bind:value
    on:blur
    on:change
    on:focus
    on:input
    on:keydown
    on:keyup
  >
    <slot />
  </select>
  <span class="sd-select-icon" aria-hidden="true"></span>
</span>
