<script lang="ts">
  export let code = '';
  export let language = 'text';
  export let framed = true;
</script>

<pre class="sd-code" data-sd-frame={framed ? undefined : 'none'} data-language={language}><code>{code}</code></pre>
