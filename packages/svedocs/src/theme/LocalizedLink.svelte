<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';
  import { resolveLocalizedHref } from './headless.js';
  import type { SvedocsThemeContext } from './types.js';

  interface $$Props extends Omit<HTMLAnchorAttributes, 'href'> {
    context: SvedocsThemeContext;
    href: string;
    external?: boolean;
  }

  export let context: SvedocsThemeContext;
  export let href: string;
  export let external = false;

  $: resolvedHref = external ? href : resolveLocalizedHref(href, context);
</script>

<a {...$$restProps} href={resolvedHref} on:click on:focus on:blur>
  <slot />
</a>
