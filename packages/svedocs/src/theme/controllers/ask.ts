import { consumeAskStream, readAskEvent } from './ask-stream.js';
import { get, writable } from 'svelte/store';
import { searchRecords } from '../../search/local.js';
import { sanitizeNavigationUrl } from '../../search/utils.js';
import type { SvedocsSearchRecord, SvedocsTranslate } from '../../core/types.js';
import type { SearchResult, SearchScope } from '../../search/types.js';
import type { SvedocsAskAiCitation, SvedocsAskAiController, SvedocsAskAiControllerOptions, SvedocsAskAiMessage } from '../types.js';
import { fallbackTranslate } from './context.js';
import { trimChatHistory } from '../../ai/history.js';

export function createAskAiController(initial: SvedocsAskAiControllerOptions): SvedocsAskAiController {
  const options = writable(normalizeAskOptions(initial));
  const open = writable(false);
  const input = writable('');
  const messages = writable<SvedocsAskAiMessage[]>([]);
  const loading = writable(false);
  const loadedRecords = writable(initial.records ?? []);
  let recordsRequest: Promise<SvedocsSearchRecord[]> | undefined;
  let recordsSource = initial.records;
  let loadRecordsSource = initial.loadRecords;
  let recordsVersion = 0;
  let messageId = 0;
  let askAbort: AbortController | undefined;
  let conversationVersion = 0;
  let scopeKey = JSON.stringify(initial.scope ?? {});

  function setOptions(nextOptions: Partial<SvedocsAskAiControllerOptions>): void {
    const recordsChanged = Object.hasOwn(nextOptions, 'records') && nextOptions.records !== recordsSource;
    const loadRecordsChanged = Object.hasOwn(nextOptions, 'loadRecords') && nextOptions.loadRecords !== loadRecordsSource;
    options.update((current) => normalizeAskOptions({ ...current, ...nextOptions }));
    const nextScopeKey = JSON.stringify(get(options).scope);
    if (nextScopeKey !== scopeKey) {
      scopeKey = nextScopeKey;
      reset();
    }
    if (loadRecordsChanged) {
      loadRecordsSource = nextOptions.loadRecords;
      recordsRequest = undefined;
      recordsVersion += 1;
      if (!recordsChanged) loadedRecords.set(recordsSource ?? []);
    }
    if (recordsChanged) {
      recordsSource = nextOptions.records;
      recordsRequest = undefined;
      recordsVersion += 1;
      loadedRecords.set(nextOptions.records ?? []);
    }
  }

  function nextId(): number {
    return ++messageId;
  }

  function show(): void {
    const currentOptions = get(options);
    if (!currentOptions.config.ai.enabled || get(open)) return;
    open.set(true);
    const welcomeMessage = currentOptions.welcomeMessage ?? currentOptions.config.ai.welcomeMessage;
    if (get(messages).length === 0 && welcomeMessage) {
      messages.set([{ id: nextId(), role: 'assistant', content: welcomeMessage, welcome: true }]);
    }
  }

  function hide(): void {
    open.set(false);
    cancelAskRequest();
  }

  function reset(): void {
    cancelAskRequest();
    const currentOptions = get(options);
    const welcomeMessage = currentOptions.welcomeMessage ?? currentOptions.config.ai.welcomeMessage;
    messages.set(welcomeMessage ? [{ id: nextId(), role: 'assistant', content: welcomeMessage, welcome: true }] : []);
    input.set('');
  }

  function setInput(value: string): void {
    input.set(value);
  }

  async function send(text = get(input)): Promise<void> {
    const value = text.trim();
    if (!value || get(loading)) return;
    const currentOptions = get(options);
    input.set('');
    const userMsg: SvedocsAskAiMessage = { id: nextId(), role: 'user', content: value };
    const assistantMsg: SvedocsAskAiMessage = { id: nextId(), role: 'assistant', content: '', citations: [] };
    messages.update((current) => [...current, userMsg, assistantMsg]);
    loading.set(true);
    const requestVersion = conversationVersion;
    const requestController = new AbortController();
    askAbort = requestController;

    const transcript = trimChatHistory(get(messages)
      .filter((message) => !message.welcome && !message.error && message.id !== userMsg.id && message.id !== assistantMsg.id)
      .map((message) => ({ role: message.role, content: message.content })));

    if (currentOptions.buildMode !== 'edge') {
      const sourceRecords = await ensureRecords();
      if (requestVersion !== conversationVersion) return;
      updateAssistant(assistantMsg.id, createLocalAskDraft(value, sourceRecords, currentOptions.scope, currentOptions.t));
      loading.set(false);
      return;
    }

    try {
      const fetcher = currentOptions.fetcher ?? globalThis.fetch;
      if (!fetcher) throw new Error(currentOptions.t('ask.fetchUnavailable'));
      const response = await fetcher(currentOptions.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream'
        },
        signal: requestController.signal,
        body: JSON.stringify({
          question: value,
          messages: transcript,
          ...currentOptions.scope
        })
      });

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        await readAskStream(response, assistantMsg.id, currentOptions.t, requestVersion);
        const streamedMessage = findMessage(assistantMsg.id);
        if (!response.ok) {
          throw new Error(streamedMessage?.error ?? currentOptions.t('ask.requestError', { status: response.status }));
        }
        if (streamedMessage?.error && !streamedMessage.content.trim()) throw new Error(streamedMessage.error);
        if (!streamedMessage?.content.trim()) throw new Error(currentOptions.t('ask.failed'));
        return;
      }
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(failure.error ?? currentOptions.t('ask.requestError', { status: response.status }));
      }
      const result = await response.json() as {
        answer?: string;
        citations?: SvedocsAskAiCitation[];
      };
      if (requestVersion !== conversationVersion) return;
      updateAssistant(assistantMsg.id, {
        content: result.answer ?? '',
        citations: sanitizeCitations(result.citations ?? [])
      });
    } catch (requestError) {
      if (requestVersion !== conversationVersion || requestController.signal.aborted) return;
      const sourceRecords = await ensureRecords();
      if (requestVersion !== conversationVersion || requestController.signal.aborted) return;
      const fallbackCitations = rankRecords(sourceRecords, value.toLowerCase(), currentOptions.scope).slice(0, 3).map((result) => ({
        title: result.title,
        url: sanitizeNavigationUrl(result.url),
        ...(result.section ? { section: result.section } : {})
      }));
      const fallback = fallbackCitations.length > 0
        ? currentOptions.t(fallbackCitations.length === 1 ? 'ask.fallbackSource' : 'ask.fallbackSources', {
            count: fallbackCitations.length,
            provider: currentOptions.config.ai.provider
          })
        : currentOptions.t('ask.fallbackReady', { provider: currentOptions.config.ai.provider });
      updateAssistant(assistantMsg.id, {
        content: fallback,
        citations: fallbackCitations,
        error: requestError instanceof Error ? requestError.message : currentOptions.t('ask.failed')
      });
    } finally {
      if (requestVersion === conversationVersion) {
        askAbort = undefined;
        loading.set(false);
      }
    }
  }

  async function ensureRecords(): Promise<SvedocsSearchRecord[]> {
    const currentRecords = get(loadedRecords);
    const currentOptions = get(options);
    if (currentRecords.length > 0 || !currentOptions.loadRecords) return currentRecords;
    if (!recordsRequest) {
      const requestVersion = recordsVersion;
      recordsRequest = currentOptions.loadRecords()
        .then((nextRecords) => {
          if (requestVersion !== recordsVersion) return get(loadedRecords);
          loadedRecords.set(nextRecords);
          return nextRecords;
        })
        .catch((error) => {
          if (requestVersion === recordsVersion) recordsRequest = undefined;
          throw error;
        });
    }
    try {
      return await recordsRequest;
    } catch {
      return get(loadedRecords);
    }
  }

  function createLocalAskDraft(question: string, records: SvedocsSearchRecord[], scope: SearchScope, t: SvedocsTranslate): Partial<SvedocsAskAiMessage> {
    const citations = rankRecords(records, question.toLowerCase(), scope).slice(0, 3).map((result) => ({
      title: result.title,
      url: sanitizeNavigationUrl(result.url),
      ...(result.section ? { section: result.section } : {})
    }));
    return {
      content: citations.length > 0
        ? t(citations.length === 1 ? 'ask.localSource' : 'ask.localSources', { count: citations.length })
        : t('ask.localEmpty'),
      citations
    };
  }

  function findMessage(id: number): SvedocsAskAiMessage | undefined {
    return get(messages).find((message) => message.id === id);
  }

  function updateAssistant(id: number, patch: Partial<SvedocsAskAiMessage>): void {
    messages.update((current) => current.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }

  function appendDelta(id: number, delta: string): void {
    if (!delta) return;
    messages.update((current) => current.map((message) => (message.id === id ? { ...message, content: message.content + delta } : message)));
  }

  function setCitations(id: number, citations: SvedocsAskAiCitation[]): void {
    messages.update((current) => current.map((message) => (message.id === id ? { ...message, citations: sanitizeCitations(citations) } : message)));
  }

  function setError(id: number, error: string): void {
    messages.update((current) => current.map((message) => (message.id === id ? { ...message, error } : message)));
  }

  function rankRecords(records: SvedocsSearchRecord[], query: string, scope: SearchScope): SearchResult[] {
    return searchRecords(records, { query, limit: 5, ...scope });
  }

  async function readAskStream(response: Response, assistantId: number, t: SvedocsTranslate, requestVersion: number): Promise<void> {
    await consumeAskStream(response, () => requestVersion === conversationVersion, (block) => {
      readAskEvent(block, t, {
        answer: (content) => updateAssistant(assistantId, { content }),
        delta: (content) => appendDelta(assistantId, content),
        citations: (citations) => setCitations(assistantId, citations),
        error: (error) => setError(assistantId, error)
      });
    });
  }

  function cancelAskRequest(): void {
    conversationVersion += 1;
    askAbort?.abort();
    askAbort = undefined;
    loading.set(false);
  }

  function sanitizeCitations(citations: SvedocsAskAiCitation[]): SvedocsAskAiCitation[] {
    return citations.map((citation) => ({ ...citation, url: sanitizeNavigationUrl(citation.url) }));
  }


  return {
    open,
    input,
    messages,
    loading,
    setOptions,
    show,
    hide,
    reset,
    setInput,
    send,
    ensureRecords
  };
}

function normalizeAskOptions(options: SvedocsAskAiControllerOptions): Required<Omit<SvedocsAskAiControllerOptions, 'loadRecords' | 'fetcher' | 'welcomeMessage'>> & Pick<SvedocsAskAiControllerOptions, 'loadRecords' | 'fetcher' | 'welcomeMessage'> {
  return {
    config: options.config,
    records: options.records ?? [],
    scope: options.scope ?? {},
    endpoint: options.endpoint ?? '/api/ask',
    buildMode: options.buildMode ?? 'edge',
    t: options.t ?? fallbackTranslate,
    ...(options.loadRecords ? { loadRecords: options.loadRecords } : {}),
    ...(Object.hasOwn(options, 'welcomeMessage') && options.welcomeMessage !== undefined ? { welcomeMessage: options.welcomeMessage } : {}),
    ...(options.fetcher ? { fetcher: options.fetcher } : {})
  };
}
