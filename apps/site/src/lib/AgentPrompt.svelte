<script lang="ts">
  import { tick } from 'svelte';
  import type { SvedocsThemeContext } from 'svedocs/theme/types';
  import englishPrompt from '../../static/prompts/build-docs.en.txt?raw';
  import chinesePrompt from '../../static/prompts/build-docs.zh.txt?raw';

  let { context }: { context: SvedocsThemeContext } = $props();
  const zh = $derived(context.localeCode === 'zh');
  const prompt = $derived((zh ? chinesePrompt : englishPrompt).trim());
  let expanded = $state(false);
  let status = $state<'idle' | 'copied' | 'failed'>('idle');
  let promptField: HTMLTextAreaElement;

  $effect(() => {
    void prompt;
    status = 'idle';
  });

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      status = 'copied';
    } catch {
      status = 'failed';
      expanded = true;
      await tick();
      promptField?.focus();
      promptField?.select();
    }
  }
</script>

<section id={zh ? '让-agent-来搭建' : 'build-with-an-agent'} class="agent-section" aria-labelledby="agent-title">
  <div class="introduction">
    <p class="eyebrow">{context.t('agent.kicker')}</p>
    <h2 id="agent-title">{context.t('agent.title')}</h2>
    <p class="description">{context.t('agent.description')}</p>
    <a class="source" href="https://github.com/backrunner/svedocs/tree/main/skills">{context.t('agent.skills')} <span aria-hidden="true">↗</span></a>
  </div>
  <div class="prompt-panel">
    <div class="panel-heading">
      <span>{context.t('agent.panel')}</span>
      <span class="language">{zh ? 'ZH' : 'EN'}</span>
    </div>
    <p class="preview">{prompt.split('\n')[0]}</p>
    <p class="scope">{context.t('agent.scope')}</p>
    <div class="actions">
      <button type="button" onclick={copyPrompt}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="8" width="12" height="13" rx="1"/><path d="M16 8V3H3v13h5"/></svg>
        {context.t('agent.copy')}
      </button>
      <span class="status" role="status">{status === 'copied' ? context.t('agent.copied') : status === 'failed' ? context.t('agent.failed') : ''}</span>
    </div>
    <details bind:open={expanded}>
      <summary>{context.t('agent.view')}</summary>
      <div class="full-prompt">
        <label for="agent-prompt">{context.t('agent.full')}</label>
        <textarea id="agent-prompt" bind:this={promptField} value={prompt} readonly spellcheck="false" rows="12"></textarea>
        <a href={`/prompts/build-docs.${zh ? 'zh' : 'en'}.txt`}>{context.t('agent.text')} <span aria-hidden="true">↗</span></a>
      </div>
    </details>
  </div>
</section>

<style>
  .agent-section { display: grid; grid-template-columns: 1fr 1.35fr; gap: 64px; margin-top: 72px; padding-top: 48px; border-top: 1px solid var(--sd-line); scroll-margin-top: 100px; }
  .eyebrow, .panel-heading, .scope { font: 12px/1.7 var(--font-mono); color: var(--sd-muted); }
  .eyebrow { margin: 0 0 16px; }
  h2 { font-size: clamp(26px, 3vw, 34px); font-weight: 600; line-height: 1.2; letter-spacing: -.035em; margin: 0; text-wrap: balance; }
  .description { color: var(--sd-muted); line-height: 1.8; margin: 20px 0; }
  a { text-decoration: none; }
  a:hover { color: var(--sd-accent); text-decoration: underline; }
  .source { font-size: 14px; }
  .prompt-panel { min-width: 0; border: 1px solid var(--sd-line); border-top: 2px solid var(--sd-accent); background: var(--sd-panel); }
  .panel-heading { display: flex; justify-content: space-between; gap: 16px; padding: 12px 20px; border-bottom: 1px solid var(--sd-line); }
  .language { color: var(--sd-accent); }
  .preview { margin: 22px 20px 16px; font-size: 16px; line-height: 1.8; }
  .scope { margin: 0 20px 20px; }
  .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 0 20px 20px; }
  button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 10px 14px; min-height: 44px; background: var(--sd-ink); color: var(--sd-bg); font-size: 14px; font-weight: 500; border: 0; border-radius: var(--sd-radius); cursor: pointer; }
  button:hover { opacity: .85; }
  .status { font-size: 13px; line-height: 1.6; color: var(--sd-muted); }
  details { border-top: 1px solid var(--sd-line); }
  summary { cursor: pointer; padding: 14px 20px; font-size: 13px; color: var(--sd-muted); }
  .full-prompt { padding: 0 20px 20px; }
  label { display: block; font-size: 13px; margin-bottom: 10px; }
  textarea { display: block; width: 100%; resize: vertical; border: 1px solid var(--sd-line); background: var(--sd-bg); color: var(--sd-ink); padding: 12px; font: 13px/1.8 var(--font-mono); overflow-wrap: anywhere; }
  .full-prompt a { display: inline-block; margin-top: 12px; font-size: 13px; }
  :is(a, button, summary, textarea):focus-visible { outline: 2px solid var(--sd-accent); outline-offset: 4px; }
  @media (max-width: 720px) {
    .agent-section { grid-template-columns: 1fr; gap: 24px; margin-top: 48px; padding-top: 32px; }
  }
</style>
