<script lang="ts">
  import { DocsApp } from 'svedocs/theme';
  import themeComponents from 'virtual:svedocs/theme-components';
  import loadSearch from 'virtual:svedocs/search-loader';
  export let data;
</script>

<DocsApp page={data.page} pages={data.pages} tree={data.tree} search={data.search} config={data.config} content={data.content} layout={data.layout} {themeComponents} {loadSearch} />
