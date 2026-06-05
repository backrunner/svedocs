<script lang="ts">
  import type { SvedocsSearchProps } from 'svedocs/theme/types';

  export let records: SvedocsSearchProps['records'] = [];
</script>

<button type="button" data-fixture-theme="search">Search {records.length}</button>
