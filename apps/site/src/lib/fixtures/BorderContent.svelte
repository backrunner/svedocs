<script lang="ts">
  import { CodeBlock } from 'svedocs/theme';
</script>

<div class="not-prose demo-grid">
  <section class="demo-panel" data-testid="custom-widget">
    <h2>Custom component</h2>
    <pre><code>A custom renderer owns this layout.</code></pre>
    <table><tbody><tr><td>One outside frame</td></tr></tbody></table>
    <p><code>Custom inline code</code></p>
    <button class="sd-button" type="button">Independent control</button>
  </section>
  <section class="demo-panel" data-testid="code-frame">
    <CodeBlock code="A reusable component without its own frame." framed={false} />
  </section>
  <div class="sd-code" data-testid="wrapped-code">
    <div class="sd-code-header">Renderer-owned toolbar</div>
    <pre><code>Only the outside code frame is drawn.</code></pre>
  </div>
  <div class="sd-code border-0 shadow-none" data-testid="utility-code">
    Utility classes can remove the default frame.
  </div>
  <div class="shadow-none" data-testid="shadow-reference" aria-hidden="true"></div>
</div>
<section data-testid="markdown-defaults">
  <h2>Default Markdown</h2>
  <pre><code>Ordinary Markdown retains its frame.</code></pre>
  <table><thead><tr><th>Default table</th></tr></thead><tbody><tr><td>Framed once</td></tr></tbody></table>
</section>

<style>
  .demo-grid { display: grid; gap: 1rem; }
  .demo-panel { min-width: 0; border: 1px solid var(--sd-line); padding: 1rem; }
  .demo-panel pre { overflow: auto; }
</style>
