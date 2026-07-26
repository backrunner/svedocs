<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import type { SvedocsResolvedConfig, SvedocsSearchRecord } from '../core/types.js';
  import type { SearchScope } from '../search/types.js';
  import { createAskAiController, fallbackTranslate } from './headless.js';
  import { portal } from './portal.js';
  import type { SvedocsAskAiController, SvedocsAskAiMessage, SvedocsThemeContext } from './types.js';

  export let config: SvedocsResolvedConfig;
  export let records: SvedocsSearchRecord[] = [];
  export let loadRecords: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let scope: SearchScope = {};
  export let buildMode: SvedocsResolvedConfig['build']['mode'] = 'edge';
  export let endpoint = '/api/ask';
  export let controller: SvedocsAskAiController | undefined = undefined;
  export let context: SvedocsThemeContext | undefined = undefined;

  const internalController = createAskAiController({ config, records, loadRecords, scope, buildMode, endpoint });
  let activeController: SvedocsAskAiController = internalController;
  let open = false;
  let input = '';
  let messages: SvedocsAskAiMessage[] = [];
  let loading = false;
  let panel: HTMLDivElement | undefined;
  let textarea: HTMLTextAreaElement | undefined;
  let scrollEl: HTMLDivElement | undefined;
  let previousFocus: HTMLElement | undefined;
  let boundController: SvedocsAskAiController | undefined;
  let unsubscribeController: (() => void) | undefined;

  $: t = context?.t ?? fallbackTranslate;
  $: activeController = controller ?? internalController;
  $: activeController.setOptions({ config, records, loadRecords, scope, buildMode, endpoint, welcomeMessage: t('ask.welcome'), t });
  $: enabled = config.ai.enabled;
  $: label = t('ask.label');
  $: placeholder = t('ask.placeholder');
  $: suggestions = [
    t('ask.suggestion.1'),
    t('ask.suggestion.2'),
    t('ask.suggestion.3')
  ].filter(Boolean);
  $: showSuggestions = suggestions.length > 0
    && !loading
    && messages.filter((message) => !message.welcome).length === 0;
  $: bindController(activeController);

  function show() {
    if (!enabled) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    activeController.show();
    tick().then(() => {
      textarea?.focus();
      scrollToBottom();
    });
  }

  function hide() {
    activeController.hide();
    tick().then(() => previousFocus?.focus());
  }

  function reset() {
    activeController.reset();
    tick().then(scrollToBottom);
  }

  function scrollToBottom() {
    if (!scrollEl) return;
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  async function send(text = input) {
    await activeController.send(text);
    await tick();
    scrollToBottom();
  }

  function handleInput(event: Event) {
    activeController.setInput((event.currentTarget as HTMLTextAreaElement).value);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
    if (event.key === 'Tab') trapFocus(event, panel);
  }

  function handleComposerKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  function bindController(nextController: SvedocsAskAiController): void {
    if (boundController === nextController) return;
    unsubscribeController?.();
    boundController = nextController;
    const unsubscribers = [
      nextController.open.subscribe((value) => (open = value)),
      nextController.input.subscribe((value) => (input = value)),
      nextController.loading.subscribe((value) => (loading = value)),
      nextController.messages.subscribe((value) => {
        messages = value;
        if (open) tick().then(scrollToBottom);
      })
    ];
    unsubscribeController = () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }

  function trapFocus(event: KeyboardEvent, root: HTMLElement | undefined) {
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    window.addEventListener('svedocs:open-ai', show);
    return () => window.removeEventListener('svedocs:open-ai', show);
  });

  onDestroy(() => {
    internalController.hide();
    unsubscribeController?.();
  });
</script>

{#if open}
  <div class="sd-chat-portal" use:portal>
    <div
      bind:this={panel}
      class="sd-chat-panel"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabindex="-1"
      on:keydown={handleKeydown}
      data-theme-component="ask-ai"
    >
      <header class="sd-chat-header">
        <div class="sd-chat-title">
          <span class="sd-chat-mark" aria-hidden="true"></span>
          <strong>{label}</strong>
        </div>
        <div class="sd-chat-actions">
          {#if messages.filter((message) => !message.welcome).length > 0}
            <button type="button" class="sd-chat-icon-button" aria-label={t('ask.newChat')} title={t('ask.newChat')} on:click={reset}>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 12h8m4 0h4M12 4v8m0 4v4" />
              </svg>
            </button>
          {/if}
          <button type="button" class="sd-chat-icon-button" aria-label={t('ask.close')} title={t('ask.close')} on:click={hide}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </header>

      <div bind:this={scrollEl} class="sd-chat-messages" role="log" aria-live="polite">
        {#if messages.length === 0}
          <div class="sd-chat-empty">
            <p>{t('ask.empty')}</p>
          </div>
        {/if}
        {#each messages as message (message.id)}
          <div class="sd-chat-bubble" data-role={message.role}>
            {#if message.content || (message.role === 'assistant' && loading && message.id === messages[messages.length - 1]?.id)}
              <div class="sd-chat-bubble-body">
                {#if !message.content}
                  <span class="sd-chat-typing" aria-label={t('ask.thinking')}>
                    <span></span><span></span><span></span>
                  </span>
                {:else}
                  {message.content}
                {/if}
              </div>
            {/if}
            {#if message.citations && message.citations.length > 0}
              <div class="sd-chat-citations">
                {#each message.citations as citation}
                  <a href={citation.url} on:click={hide}>
                    {citation.section ?? citation.title}
                  </a>
                {/each}
              </div>
            {/if}
            {#if message.error}
              <p class="sd-chat-error">{message.error}</p>
            {/if}
          </div>
        {/each}
      </div>

      {#if showSuggestions}
        <div class="sd-chat-suggestions">
          {#each suggestions as suggestion}
            <button type="button" on:click={() => send(suggestion)}>{suggestion}</button>
          {/each}
        </div>
      {/if}

      <form class="sd-chat-composer" on:submit|preventDefault={() => send(input)}>
        <textarea
          bind:this={textarea}
          value={input}
          rows="1"
          placeholder={placeholder}
          on:input={handleInput}
          on:keydown={handleComposerKeydown}
        ></textarea>
        <button
          class="sd-chat-send"
          type="submit"
          aria-label={t('ask.send')}
          title={t('ask.send')}
          disabled={!input.trim() || loading}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 12l16-8-6 16-2-7-8-1Z" />
          </svg>
        </button>
      </form>
    </div>
  </div>
{/if}
