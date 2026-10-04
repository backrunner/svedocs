<script lang="ts">
  import { Article } from 'svedocs/theme';
  import type { SvedocsArticleProps } from 'svedocs/theme/types';
  let props: SvedocsArticleProps = $props();
</script>

<section class="custom-article-frame" data-testid="article-frame" style="border: 1px solid var(--sd-line)">
  <Article {...props} framed={false} />
</section>

<style>
  .custom-article-frame { min-width: 0; border-radius: 12px; }
</style>
