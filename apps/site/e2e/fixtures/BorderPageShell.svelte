<script lang="ts">
  import { PageShell } from 'svedocs/theme';
  import type { SvedocsPageShellProps } from 'svedocs/theme/types';
  let props: SvedocsPageShellProps = $props();
</script>

<section class="custom-page-frame" data-testid="page-frame" style="border: 1px solid var(--sd-line)">
  <PageShell {...props} framed={false} />
</section>

<style>
  .custom-page-frame { width: min(100% - 2rem, 920px); margin: 2rem auto; border-radius: 12px; }
</style>
