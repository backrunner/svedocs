<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { SvedocsResolvedConfig, SvedocsSearchRecord } from '../core/types.js';
  import { searchRecords } from '../search/local.js';
  import type { SearchScope } from '../search/types.js';
  import { portal } from './portal.js';

  type Citation = { title: string; url: string; section?: string };
  type ChatRole = 'user' | 'assistant';
  type ChatMessage = {
    id: number;
    role: ChatRole;
    content: string;
    citations?: Citation[];
    error?: string;
    welcome?: boolean;
  };

  export let config: SvedocsResolvedConfig;
  export let records: SvedocsSearchRecord[] = [];
  export let loadRecords: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let scope: SearchScope = {};
  export let buildMode: SvedocsResolvedConfig['build']['mode'] = 'edge';

  let open = false;
  let input = '';
  let messages: ChatMessage[] = [];
  let loading = false;
  let panel: HTMLDivElement | undefined;
  let textarea: HTMLTextAreaElement | undefined;
  let scrollEl: HTMLDivElement | undefined;
  let previousFocus: HTMLElement | undefined;
  let messageId = 0;
  let loadedRecords: SvedocsSearchRecord[] = records;
  let recordsRequest: Promise<SvedocsSearchRecord[]> | undefined;

  $: if (records.length > 0 && loadedRecords !== records) {
    loadedRecords = records;
  }
  $: enabled = config.ai.enabled;
  $: label = config.ai.label ?? 'Ask AI';
  $: placeholder = config.ai.placeholder ?? 'Ask about the docs';
  $: suggestions = config.ai.suggestions ?? [];
  $: welcomeMessage = config.ai.welcomeMessage;
  $: showSuggestions = suggestions.length > 0
    && !loading
    && messages.filter((m) => !m.welcome).length === 0;

  function nextId() {
    return ++messageId;
  }

  function show() {
    if (!enabled) return;
    if (open) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    open = true;
    if (messages.length === 0 && welcomeMessage) {
      messages = [{ id: nextId(), role: 'assistant', content: welcomeMessage, welcome: true }];
    }
    tick().then(() => {
      textarea?.focus();
      scrollToBottom();
    });
  }

  function hide() {
    open = false;
    tick().then(() => previousFocus?.focus());
  }

  function reset() {
    messages = welcomeMessage
      ? [{ id: nextId(), role: 'assistant', content: welcomeMessage, welcome: true }]
      : [];
    input = '';
  }

  function scrollToBottom() {
    if (!scrollEl) return;
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  async function send(text: string) {
    const value = text.trim();
    if (!value || loading) return;
    input = '';
    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: value };
    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '', citations: [] };
    messages = [...messages, userMsg, assistantMsg];
    loading = true;
    await tick();
    scrollToBottom();

    const transcript = messages
      .filter((m) => !m.welcome && !(m.role === 'assistant' && m.id === assistantMsg.id))
      .map((m) => ({ role: m.role, content: m.content }));

    if (buildMode !== 'edge') {
      const sourceRecords = await ensureRecords();
      updateAssistant(assistantMsg.id, createLocalAskDraft(value, sourceRecords));
      loading = false;
      await tick();
      scrollToBottom();
      return;
    }

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream'
        },
        body: JSON.stringify({
          question: value,
          messages: transcript,
          ...scope
        })
      });

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        await readAskStream(response, assistantMsg.id);
        if (!response.ok && !findMessage(assistantMsg.id)?.error) {
          throw new Error(`Ask AI returned ${response.status}.`);
        }
        return;
      }
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(failure.error ?? `Ask AI returned ${response.status}.`);
      }
      const result = await response.json() as {
        answer?: string;
        citations?: Citation[];
      };
      updateAssistant(assistantMsg.id, {
        content: result.answer ?? '',
        citations: result.citations ?? []
      });
    } catch (requestError) {
      const sourceRecords = await ensureRecords();
      const fallbackCitations = rankRecords(sourceRecords, value.toLowerCase(), scope).slice(0, 3).map((result) => ({
        title: result.title,
        url: result.url,
        ...(result.section ? { section: result.section } : {})
      }));
      const fallback = fallbackCitations.length > 0
        ? `I found ${fallbackCitations.length} relevant source${fallbackCitations.length === 1 ? '' : 's'}. Connect the ${config.ai.provider} provider to replace this local draft with a hosted Ask AI response.`
        : `Ask AI is ready. Connect ${config.ai.provider} and index your docs to answer this question with citations.`;
      updateAssistant(assistantMsg.id, {
        content: fallback,
        citations: fallbackCitations,
        error: requestError instanceof Error ? requestError.message : 'Ask AI failed.'
      });
    } finally {
      loading = false;
      await tick();
      scrollToBottom();
    }
  }

  async function ensureRecords(): Promise<SvedocsSearchRecord[]> {
    if (loadedRecords.length > 0 || !loadRecords) return loadedRecords;
    if (!recordsRequest) {
      recordsRequest = loadRecords()
        .then((nextRecords) => {
          loadedRecords = nextRecords;
          return nextRecords;
        })
        .catch((error) => {
          recordsRequest = undefined;
          throw error;
        });
    }
    try {
      return await recordsRequest;
    } catch {
      return loadedRecords;
    }
  }

  function createLocalAskDraft(question: string, records: SvedocsSearchRecord[]): Partial<ChatMessage> {
    const citations = rankRecords(records, question.toLowerCase(), scope).slice(0, 3).map((result) => ({
      title: result.title,
      url: result.url,
      ...(result.section ? { section: result.section } : {})
    }));
    return {
      content: citations.length > 0
        ? `I found ${citations.length} relevant source${citations.length === 1 ? '' : 's'} in this documentation.`
        : 'I could not find a matching local source for that question.',
      citations
    };
  }

  function findMessage(id: number): ChatMessage | undefined {
    return messages.find((m) => m.id === id);
  }

  function updateAssistant(id: number, patch: Partial<ChatMessage>) {
    messages = messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
  }

  function appendDelta(id: number, delta: string) {
    if (!delta) return;
    messages = messages.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m));
    scrollToBottom();
  }

  function setCitations(id: number, citations: Citation[]) {
    messages = messages.map((m) => (m.id === id ? { ...m, citations } : m));
  }

  function setError(id: number, error: string) {
    messages = messages.map((m) => (m.id === id ? { ...m, error } : m));
  }

  function rankRecords(records: SvedocsSearchRecord[], query: string, scope: SearchScope) {
    return searchRecords(records, { query, limit: 5, ...scope });
  }

  async function readAskStream(response: Response, assistantId: number) {
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        readAskEvent(buffer.slice(0, boundary), assistantId);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    }
    if (buffer.trim()) readAskEvent(buffer, assistantId);
  }

  function readAskEvent(block: string, assistantId: number) {
    const event = /^event:\s*(.+)$/m.exec(block)?.[1] ?? 'message';
    const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data || data === '[DONE]') return;
    const payload = JSON.parse(data) as {
      answer?: string;
      delta?: string;
      content?: string;
      citations?: Citation[];
      chunks?: Array<{ title?: string; url?: string; metadata?: Record<string, unknown>; item?: { title?: string; metadata?: Record<string, unknown> } }>;
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string }; text?: string }>;
      error?: string;
    };
    if (event === 'answer') updateAssistant(assistantId, { content: payload.answer ?? '' });
    if (event === 'delta') appendDelta(assistantId, payload.delta ?? payload.content ?? '');
    if (event === 'message') {
      appendDelta(
        assistantId,
        payload.choices?.[0]?.delta?.content
          ?? payload.choices?.[0]?.message?.content
          ?? payload.choices?.[0]?.text
          ?? payload.content
          ?? ''
      );
    }
    if (event === 'chunks') setCitations(assistantId, normalizeChunkCitations(payload.chunks ?? []));
    if (event === 'citations') setCitations(assistantId, payload.citations ?? []);
    if (event === 'error') setError(assistantId, payload.error ?? 'Ask AI failed.');
  }

  function normalizeChunkCitations(chunks: Array<{ title?: string; url?: string; metadata?: Record<string, unknown>; item?: { title?: string; metadata?: Record<string, unknown> } }>): Citation[] {
    return chunks.slice(0, 5).map((chunk, index) => {
      const metadata = normalizeSvedocsMetadata({ ...(chunk.item?.metadata ?? {}), ...(chunk.metadata ?? {}) });
      const section = stringValue(metadata.section);
      return {
        title: stringValue(chunk.title) ?? stringValue(chunk.item?.title) ?? stringValue(metadata.title) ?? `Source ${index + 1}`,
        url: stringValue(chunk.url) ?? stringValue(metadata.url) ?? stringValue(metadata.source_url) ?? '#',
        ...(section ? { section } : {})
      };
    });
  }

  function normalizeSvedocsMetadata(metadata: Record<string, unknown>) {
    const embedded = stringValue(metadata.svedocs);
    if (!embedded) return metadata;
    try {
      const parsed = JSON.parse(embedded) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return metadata;
      return { ...metadata, ...parsed };
    } catch {
      return metadata;
    }
  }

  function stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
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
      send(input);
    }
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
    >
      <header class="sd-chat-header">
        <div class="sd-chat-title">
          <span class="sd-chat-mark" aria-hidden="true"></span>
          <strong>{label}</strong>
        </div>
        <div class="sd-chat-actions">
          {#if messages.filter((m) => !m.welcome).length > 0}
            <button type="button" class="sd-chat-icon-button" aria-label="New chat" title="New chat" on:click={reset}>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 12h8m4 0h4M12 4v8m0 4v4" />
              </svg>
            </button>
          {/if}
          <button type="button" class="sd-chat-icon-button" aria-label="Close" title="Close" on:click={hide}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </header>

      <div bind:this={scrollEl} class="sd-chat-messages" role="log" aria-live="polite">
        {#if messages.length === 0}
          <div class="sd-chat-empty">
            <p>Ask anything about these docs.</p>
          </div>
        {/if}
        {#each messages as message (message.id)}
          <div class="sd-chat-bubble" data-role={message.role}>
            <div class="sd-chat-bubble-body">
              {#if message.role === 'assistant' && !message.content && loading && message.id === messages[messages.length - 1]?.id}
                <span class="sd-chat-typing" aria-label="Thinking">
                  <span></span><span></span><span></span>
                </span>
              {:else}
                {message.content}
              {/if}
            </div>
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
          bind:value={input}
          rows="1"
          placeholder={placeholder}
          on:keydown={handleComposerKeydown}
        ></textarea>
        <button
          class="sd-chat-send"
          type="submit"
          aria-label="Send"
          title="Send"
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
