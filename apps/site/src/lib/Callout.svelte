<script lang="ts">
  export let tone: 'note' | 'edge' = 'note';
</script>

<aside class="sd-callout" data-tone={tone}>
  <slot />
</aside>
