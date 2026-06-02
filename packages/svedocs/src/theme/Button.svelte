<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { classNames, type SvedocsButtonVariant, type SvedocsControlDensity } from './forms.js';

  interface $$Props extends Omit<HTMLButtonAttributes, 'class' | 'type'> {
    class?: string;
    density?: SvedocsControlDensity;
    type?: HTMLButtonAttributes['type'];
    variant?: SvedocsButtonVariant;
  }

  export let type: HTMLButtonAttributes['type'] = 'button';
  export let variant: SvedocsButtonVariant = 'default';
  export let density: SvedocsControlDensity = 'md';

  let className = '';

  export { className as class };
</script>

<button
  {...$$restProps}
  class={classNames('sd-control-button', className)}
  data-variant={variant}
  data-density={density}
  {type}
  on:blur
  on:click
  on:focus
  on:keydown
  on:keyup
>
  <slot />
</button>
