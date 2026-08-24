<script lang="ts">
  import type { HTMLImgAttributes } from 'svelte/elements';

  interface $$Props extends Omit<HTMLImgAttributes, 'class' | 'height' | 'src' | 'width'> {
    alt?: string;
    class?: string;
    displayWidth?: number | string;
    height?: HTMLImgAttributes['height'];
    src: string;
    width?: HTMLImgAttributes['width'];
  }

  export let src: string;
  export let alt = '';
  export let width: HTMLImgAttributes['width'] = undefined;
  export let height: HTMLImgAttributes['height'] = undefined;
  export let displayWidth: number | string | undefined = undefined;

  let className = '';

  export { className as class };
</script>

<img
  {...$$restProps}
  {src}
  {alt}
  {width}
  {height}
  class={className}
  data-svedocs-image
  data-display-width={displayWidth}
  on:load
  on:error
/>
