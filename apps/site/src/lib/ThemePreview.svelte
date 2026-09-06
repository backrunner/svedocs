<script lang="ts">
  import { useSvedocsTheme, resolveLocalizedHref } from 'svedocs/theme/headless';
  const theme = useSvedocsTheme();
  let accent = $state('#007f68');
  let radius = $state(2);
  const zh = $derived($theme.localeCode === 'zh');
</script>

<div class="controls">
  <label>{zh ? '强调色' : 'Accent color'} <input aria-label={zh ? '强调色' : 'Accent color'} type="color" bind:value={accent} /></label>
  <label>{zh ? '圆角' : 'Corner radius'} <input aria-label={zh ? '圆角' : 'Corner radius'} type="range" min="0" max="20" bind:value={radius} /> {radius}px</label>
</div>
<div class="preview" style={`--preview-accent:${accent}; --preview-radius:${radius}px;`}>
  <span class="site">{$theme.config.site.name} · {$theme.languageTag}</span>
  <h2>{zh ? '这是你自己的 Svelte 页面' : 'A Svelte page of your own'}</h2>
  <p>{zh ? '组件通过主题上下文读取站点配置、当前语言和文档链接。控件只修改这个示例。' : 'This component reads the site config, current language and documentation links from the theme context. These controls only change the example.'}</p>
  <a href={resolveLocalizedHref('/docs/configuration/theme', $theme)}>{zh ? '查看主题文档' : 'Read the theme docs'} →</a>
</div>
<pre><code>{`theme: {\n  palette: { accent: '${accent}' },\n  radius: '${radius}px'\n}`}</code></pre>

<style>
  .controls { display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 24px; }
  label { display: flex; align-items: center; gap: 12px; }
  input[type='color'] { width: 40px; height: 32px; padding: 2px; border: 1px solid var(--sd-line); background: var(--sd-panel); }
  .preview { border: 1px solid var(--preview-accent); border-radius: var(--preview-radius); padding: 28px; }
  .site { font: 12px var(--font-mono); color: var(--sd-muted); }
  .preview h2 { margin-top: 16px; }
  .preview a { display: inline-block; padding: 8px 16px; color: white; background: var(--preview-accent); border-radius: var(--preview-radius); text-decoration: none; }
  pre { overflow: auto; margin-top: 24px; padding: 20px; background: var(--sd-panel); border: 1px solid var(--sd-line); }
</style>
