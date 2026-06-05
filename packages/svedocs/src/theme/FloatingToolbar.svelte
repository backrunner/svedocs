<script lang="ts">
  import type { SvedocsResolvedConfig } from '../core/types.js';
  import PageTools from './PageTools.svelte';

  export let config: SvedocsResolvedConfig;
</script>

<PageTools {config} />
