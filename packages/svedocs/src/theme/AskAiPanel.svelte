<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { SvedocsResolvedConfig, SvedocsSearchRecord } from '../core/types.js';
  import { searchRecords } from '../search/local.js';
  import type { SearchScope } from '../search/types.js';

  export let config: SvedocsResolvedConfig;
  export let records: SvedocsSearchRecord[] = [];
  export let scope: SearchScope = {};

  let open = false;
  let question = '';
  let answer = '';
  let citations: Array<{ title: string; url: string; section?: string }> = [];
  let loading = false;
  let error = '';
  let trigger: HTMLButtonElement | undefined;
  let panel: HTMLDivElement | undefined;
  let textarea: HTMLTextAreaElement | undefined;
  let previousFocus: HTMLElement | undefined;

  $: enabled = config.ai.enabled;

  function show() {
    if (!enabled) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    open = true;
    tick().then(() => textarea?.focus());
  }

  function hide() {
    open = false;
    tick().then(() => (previousFocus ?? trigger)?.focus());
  }

  async function ask() {
    const normalized = question.trim().toLowerCase();
    error = '';
    answer = '';
    citations = [];
    loading = true;
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream'
        },
        body: JSON.stringify({ question, ...scope })
      });
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        await readAskStream(response);
        if (!response.ok && !error) throw new Error(`Ask AI returned ${response.status}.`);
        return;
      }
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(failure.error ?? `Ask AI returned ${response.status}.`);
      }
      const result = await response.json() as {
        answer?: string;
        citations?: Array<{ title: string; url: string; section?: string }>;
      };
      answer = result.answer ?? '';
      citations = result.citations ?? [];
    } catch (requestError) {
      citations = rankRecords(records, normalized, scope).slice(0, 3).map((result) => ({
        title: result.title,
        url: result.url,
        ...(result.section ? { section: result.section } : {})
      }));
      answer = citations.length > 0
        ? `I found ${citations.length} relevant source${citations.length === 1 ? '' : 's'} in this documentation. Connect the ${config.ai.provider} provider to replace this local draft with a hosted Ask AI response.`
        : `Ask AI is ready. Connect ${config.ai.provider} and index your docs to answer this question with citations.`;
      error = requestError instanceof Error ? requestError.message : 'Ask AI failed.';
    } finally {
      loading = false;
    }
  }

  function rankRecords(records: SvedocsSearchRecord[], query: string, scope: SearchScope) {
    return searchRecords(records, { query, limit: 5, ...scope });
  }

  async function readAskStream(response: Response) {
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
        readAskEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    }
    if (buffer.trim()) readAskEvent(buffer);
  }

  function readAskEvent(block: string) {
    const event = /^event:\s*(.+)$/m.exec(block)?.[1] ?? 'message';
    const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data || data === '[DONE]') return;
    const payload = JSON.parse(data) as {
      answer?: string;
      delta?: string;
      content?: string;
      citations?: Array<{ title: string; url: string; section?: string }>;
      chunks?: Array<{ title?: string; url?: string; metadata?: Record<string, unknown>; item?: { title?: string; metadata?: Record<string, unknown> } }>;
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string }; text?: string }>;
      error?: string;
    };
    if (event === 'answer') answer = payload.answer ?? '';
    if (event === 'delta') answer += payload.delta ?? payload.content ?? '';
    if (event === 'message') {
      answer += payload.choices?.[0]?.delta?.content
        ?? payload.choices?.[0]?.message?.content
        ?? payload.choices?.[0]?.text
        ?? payload.content
        ?? '';
    }
    if (event === 'chunks') citations = normalizeChunkCitations(payload.chunks ?? []);
    if (event === 'citations') citations = payload.citations ?? [];
    if (event === 'error') error = payload.error ?? 'Ask AI failed.';
  }

  function normalizeChunkCitations(chunks: Array<{ title?: string; url?: string; metadata?: Record<string, unknown>; item?: { title?: string; metadata?: Record<string, unknown> } }>) {
    return chunks.slice(0, 5).map((chunk, index) => {
      const metadata = normalizeSvedocsMetadata({ ...(chunk.item?.metadata ?? {}), ...(chunk.metadata ?? {}) });
      return {
        title: stringValue(chunk.title) ?? stringValue(chunk.item?.title) ?? stringValue(metadata.title) ?? `Source ${index + 1}`,
        url: stringValue(chunk.url) ?? stringValue(metadata.url) ?? stringValue(metadata.source_url) ?? '#',
        ...(stringValue(metadata.section) ? { section: stringValue(metadata.section) } : {})
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

  function handlePanelKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') hide();
    if (event.key === 'Tab') trapFocus(event, panel);
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

{#if enabled}
  <button bind:this={trigger} class="sd-ai-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} on:click={show}>
    Ask AI
  </button>
{/if}

{#if open}
  <div class="sd-dialog-backdrop" role="presentation" on:click={hide}></div>
  <div bind:this={panel} class="sd-ai-panel" role="dialog" aria-modal="true" aria-label="Ask AI" tabindex="-1" on:keydown={handlePanelKeydown}>
    <header>
      <strong>Ask AI</strong>
      <button type="button" aria-label="Close Ask AI" on:click={hide}>×</button>
    </header>
    <textarea bind:this={textarea} bind:value={question} placeholder="Ask about these docs"></textarea>
    <button class="sd-button sd-button-primary" type="button" on:click={ask} disabled={!question.trim() || loading}>
      {loading ? 'Thinking' : 'Ask'}
    </button>
    {#if error}
      <p class="sd-ai-error">{error}</p>
    {/if}
    {#if answer}
      <div class="sd-ai-answer">
        <p>{answer}</p>
        {#if citations.length > 0}
          <div class="sd-ai-citations">
            {#each citations as citation}
              <a href={citation.url} on:click={hide}>
                {citation.section ?? citation.title}
                <span>{citation.title}</span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
