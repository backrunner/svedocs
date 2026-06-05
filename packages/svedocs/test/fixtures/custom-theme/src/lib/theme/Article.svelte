<script lang="ts">
  import type { SvedocsArticleProps } from 'svedocs/theme/types';

  export let page: SvedocsArticleProps['page'];
</script>

<article data-fixture-theme="article">
  <h1>{page.title}</h1>
</article>
