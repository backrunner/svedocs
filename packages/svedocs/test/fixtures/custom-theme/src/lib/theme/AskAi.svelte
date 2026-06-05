<script lang="ts">
  import type { SvedocsAskAiProps } from 'svedocs/theme/types';

  export let config: SvedocsAskAiProps['config'];
</script>

<button type="button" data-fixture-theme="ask-ai">{config.ai.label}</button>
