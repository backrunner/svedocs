<script lang="ts">
  import type { SvedocsNavbarProps } from 'svedocs/theme/types';

  export let context: SvedocsNavbarProps['context'];
</script>

<header data-fixture-theme="navbar">{context.config.site.name}</header>
