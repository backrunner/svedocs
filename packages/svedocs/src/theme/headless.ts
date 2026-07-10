import { tick } from 'svelte';
import { derived, get, writable } from 'svelte/store';
import { defaultSvedocsMessages } from '../core/config.js';
import type { SvedocsMessageKey, SvedocsMessages, SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTranslate } from '../core/types.js';
import { filterSearchRecords, searchRecords } from '../search/local.js';
import type { SearchResult, SearchScope } from '../search/types.js';
import type {
  SvedocsAskAiCitation,
  SvedocsAskAiController,
  SvedocsAskAiControllerOptions,
  SvedocsAskAiMessage,
  SvedocsMobileNavController,
  SvedocsPageToolsController,
  SvedocsSearchController,
  SvedocsSearchControllerOptions,
  SvedocsThemeContext,
  SvedocsThemeModeController,
  SvedocsTocController
} from './types.js';

const accentPalette: Record<string, string> = {
  emerald: '#007f68',
  teal: '#087f8c',
  sky: '#0969da',
  indigo: '#4f46e5',
  rose: '#c83e4d',
  amber: '#b36b00'
};

const copyIconSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h9v14H9zM6 8v12h10"/></svg>';
const checkIconSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"/></svg>';

export function createThemeContext(input: {
  config: SvedocsResolvedConfig;
  page?: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsThemeContext['tree'];
  search?: SvedocsSearchRecord[];
  loadSearch?: SvedocsThemeContext['loadSearch'];
  localeCode?: string;
}): SvedocsThemeContext {
  const page = input.page;
  const localeCode = input.localeCode ?? page?.locale ?? input.config.i18n.defaultLocale ?? 'en';
  const locale = input.config.i18n.locales.find((candidate) => candidate.code === localeCode);
  const languageTag = locale?.hreflang ?? localeCode;
  const messages = resolveMessages(input.config, localeCode);
  const t = createTranslate(messages);
  const activeNavHref = resolveLocalizedActiveNavHref(
    input.config.theme.nav,
    page?.routePath ?? '/',
    input.config,
    input.pages ?? [],
    localeCode
  );
  return {
    config: input.config,
    ...(page ? { page } : {}),
    pages: input.pages ?? [],
    tree: input.tree ?? [],
    search: input.search ?? [],
    ...(input.loadSearch ? { loadSearch: input.loadSearch } : {}),
    searchScope: createRuntimeScope(input.config.search.scope, page),
    aiScope: createRuntimeScope(input.config.ai.scope, page),
    surface: page?.frontmatter.layout === 'home' || page?.scopePath === '/' ? 'home' : 'reading',
    isDocsPage: page?.kind === 'doc',
    activeNavHref,
    ...(locale ? { locale } : {}),
    localeCode,
    languageTag,
    messages,
    t
  };
}

export function resolveMessages(config: SvedocsResolvedConfig, localeCode?: string): SvedocsMessages {
  return config.i18n.messages[localeCode ?? config.i18n.defaultLocale ?? 'en']
    ?? config.i18n.messages[config.i18n.defaultLocale ?? 'en']
    ?? config.i18n.messages.en
    ?? defaultSvedocsMessages;
}

export function createTranslate(messages: SvedocsMessages): SvedocsThemeContext['t'] {
  return (key, values) => formatMessage(messages[key] ?? (defaultSvedocsMessages as SvedocsMessages)[key] ?? key, values);
}

export function formatMessage(message: string, values: Record<string, string | number> | undefined): string {
  if (!values) return message;
  return message.replace(/\{([A-Za-z0-9_.-]+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export function fallbackTranslate(key: SvedocsMessageKey, values?: Record<string, string | number>): string {
  return formatMessage((defaultSvedocsMessages as SvedocsMessages)[key] ?? key, values);
}

export function createRuntimeScope(mode: 'current' | 'all', page: SvedocsPage | undefined): SearchScope {
  if (mode === 'all' || !page) return {};
  return {
    ...(page.locale ? { locale: page.locale } : {})
  };
}

export function createThemeStyle(config: SvedocsResolvedConfig): string {
  const accent = resolveColor(config.theme.palette.accent, '#007f68');
  return [
    `--font-sans:${config.theme.fonts.sans}`,
    `--font-mono:${config.theme.fonts.mono}`,
    `--sd-font-display:${config.theme.fonts.display}`,
    `--sd-radius:${config.theme.radius}`,
    `--sd-accent:${accent}`
  ].join(';');
}

export function createThemeInitScript(defaultMode: 'light' | 'dark' | 'system', languageTag = 'en', dir: 'ltr' | 'rtl' = 'ltr'): string {
  return `<script>(function(){try{var d=${serializeInlineScriptValue(defaultMode)};var l=${serializeInlineScriptValue(languageTag)};var r=${serializeInlineScriptValue(dir)};var s=localStorage.getItem('svedocs-theme');var p=s==='dark'||s==='light'||s==='system'?s:d;var t=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;document.documentElement.lang=l;document.documentElement.dir=r;}catch(e){}})();<\/script>`;
}

function serializeInlineScriptValue(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function resolveColor(value: string, fallback: string): string {
  if (/^(#|rgb|hsl|oklch|color-mix)/.test(value)) return value;
  return accentPalette[value] ?? fallback;
}

export function linkRel(item: { external?: boolean; rel?: string }): string | undefined {
  return item.external ? 'noreferrer' : item.rel;
}

export function resolveLocalizedNavItem(
  item: { label: string; labelKey?: string; href: string; external?: boolean },
  context: SvedocsThemeContext
): { label: string; labelKey?: string; href: string; external?: boolean } {
  const label = resolveLocalizedText(item.label, item.labelKey, context);
  if (item.external) return { ...item, label };
  return {
    ...item,
    label,
    href: resolveLocalizedHref(item.href, context)
  };
}

export function resolveLocalizedText(
  fallback: string,
  key: string | undefined,
  context: Pick<SvedocsThemeContext, 'messages' | 't'>
): string {
  return key && context.messages[key] !== undefined ? context.t(key) : fallback;
}

export function resolveLocalizedHref(href: string, context: SvedocsThemeContext): string {
  return resolveLocalizedHrefForLocale(href, context.config, context.pages, context.localeCode);
}

export function resolveLocaleCodeFromPath(path: string, config: SvedocsResolvedConfig): string {
  const segments = normalizePath(path).split('/').filter(Boolean);
  const localePath = segments[0] === 'docs' ? segments[1] : segments[0];
  const locale = config.i18n.locales.find((candidate) => candidate.path === decodePathSegment(localePath));
  return locale?.code ?? config.i18n.defaultLocale ?? 'en';
}

function resolveLocalizedActiveNavHref(
  nav: Array<{ href: string; external?: boolean }>,
  currentPath: string,
  config: SvedocsResolvedConfig,
  pages: SvedocsPage[],
  localeCode: string
): string {
  const localizedNav = nav.map((item) => (
    item.external
      ? item
      : {
          ...item,
          href: resolveLocalizedHrefForLocale(item.href, config, pages, localeCode)
        }
  ));
  return resolveActiveNavHref(localizedNav, currentPath);
}

function resolveLocalizedHrefForLocale(
  href: string,
  config: SvedocsResolvedConfig,
  pages: SvedocsPage[],
  localeCode: string
): string {
  const hrefPath = normalizePath(href);
  const target = pages.find((candidate) => (
    candidate.scopePath === hrefPath
    && (candidate.locale ?? config.i18n.defaultLocale ?? 'en') === localeCode
  ));
  if (!target) return href;
  const suffix = href.match(/[?#].*$/)?.[0] ?? '';
  return `${target.routePath}${suffix}`;
}

export function isActiveNavItem(item: { href: string; external?: boolean }, activeNavHref: string): boolean {
  return !item.external && normalizePath(item.href) === activeNavHref;
}

export function handleSamePathNavClick(event: MouseEvent, href: string, external?: boolean): void {
  if (external) return;
  if (event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (typeof window === 'undefined') return;

  const target = createComparableUrl(href, window.location.href);
  if (!target) return;

  const current = createComparableUrl(window.location.href, window.location.href);
  if (target === current) event.preventDefault();
}

export function createDomId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'site';
}

export function resolveActiveNavHref(nav: Array<{ href: string; external?: boolean }>, currentPath: string): string {
  const normalizedCurrentPath = normalizePath(currentPath);
  let activeHref = '';

  for (const item of nav) {
    if (item.external) continue;

    const normalizedHref = normalizePath(item.href);
    if (!isPathMatch(normalizedCurrentPath, normalizedHref)) continue;

    if (normalizedHref.length > activeHref.length) activeHref = normalizedHref;
  }

  return activeHref;
}

export function normalizePath(path: string): string {
  const pathname = getPathname(path);
  const withoutTrailingSlash = pathname.replace(/\/+$/, '');
  return withoutTrailingSlash ? withoutTrailingSlash : '/';
}

export function createSearchController(initial: SvedocsSearchControllerOptions = {}): SvedocsSearchController {
  const options = writable(normalizeSearchOptions(initial));
  const open = writable(false);
  const query = writable('');
  const activeIndex = writable(0);
  const remoteResults = writable<SearchResult[]>([]);
  const remoteStatus = writable<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const remoteError = writable('');
  const loadedRecords = writable(initial.records ?? []);
  const recordsStatus = writable<'idle' | 'loading' | 'ready' | 'error'>((initial.records?.length ?? 0) > 0 ? 'ready' : 'idle');
  let recordsRequest: Promise<SvedocsSearchRecord[]> | undefined;
  let recordsSource = initial.records;
  let loadRecordsSource = initial.loadRecords;
  let recordsVersion = 0;
  let remoteKey = '';
  let remoteRequestId = 0;

  const usesRemoteSearch = derived(options, ($options) => isRemoteSearch($options));
  const localResults = derived([query, loadedRecords, options], ([$query, $records, $options]) => (
    $query.trim()
      ? searchRecords($records, { query: $query, limit: 8, ...$options.scope })
      : createDefaultSearchResults($records, $options.scope)
  ));
  const results = derived(
    [usesRemoteSearch, query, remoteStatus, remoteResults, localResults],
    ([$usesRemoteSearch, $query, $remoteStatus, $remoteResults, $localResults]) => (
      $usesRemoteSearch && $query.trim()
        ? $remoteStatus === 'error' ? $localResults : $remoteResults
        : $localResults
    )
  );

  results.subscribe((nextResults) => {
    activeIndex.update((value) => Math.min(value, Math.max(nextResults.length - 1, 0)));
  });

  function setOptions(nextOptions: Partial<SvedocsSearchControllerOptions>): void {
    const recordsChanged = Object.hasOwn(nextOptions, 'records') && nextOptions.records !== recordsSource;
    const loadRecordsChanged = Object.hasOwn(nextOptions, 'loadRecords') && nextOptions.loadRecords !== loadRecordsSource;
    options.update((current) => normalizeSearchOptions({ ...current, ...nextOptions }));
    if (loadRecordsChanged) {
      loadRecordsSource = nextOptions.loadRecords;
      recordsRequest = undefined;
      recordsVersion += 1;
      if (!recordsChanged) {
        const nextRecords = recordsSource ?? [];
        loadedRecords.set(nextRecords);
        recordsStatus.set(nextRecords.length > 0 ? 'ready' : 'idle');
      }
    }
    if (recordsChanged) {
      recordsSource = nextOptions.records;
      recordsRequest = undefined;
      recordsVersion += 1;
      const nextRecords = nextOptions.records ?? [];
      loadedRecords.set(nextRecords);
      recordsStatus.set(nextRecords.length > 0 ? 'ready' : 'idle');
    }
    syncRemoteResults();
  }

  function show(): void {
    open.set(true);
    void ensureRecords();
    syncRemoteResults();
  }

  function hide(): void {
    open.set(false);
    setQuery('');
    activeIndex.set(0);
  }

  function setQuery(value: string): void {
    query.set(value);
    activeIndex.set(0);
    if (!value.trim()) {
      remoteResults.set([]);
      remoteStatus.set('idle');
      remoteError.set('');
      remoteKey = '';
      return;
    }
    syncRemoteResults();
  }

  function moveActive(delta: number): void {
    const nextResults = get(results);
    activeIndex.update((value) => Math.min(Math.max(value + delta, 0), Math.max(nextResults.length - 1, 0)));
  }

  function activate(index: number): void {
    activeIndex.set(index);
  }

  function select(index = get(activeIndex)): SearchResult | undefined {
    const result = get(results)[index];
    if (result) hide();
    return result;
  }

  async function ensureRecords(): Promise<SvedocsSearchRecord[]> {
    const currentRecords = get(loadedRecords);
    const currentOptions = get(options);
    if (currentRecords.length > 0 || !currentOptions.loadRecords) return currentRecords;
    if (!recordsRequest) {
      const requestVersion = recordsVersion;
      recordsStatus.set('loading');
      recordsRequest = currentOptions.loadRecords()
        .then((nextRecords) => {
          if (requestVersion !== recordsVersion) return get(loadedRecords);
          loadedRecords.set(nextRecords);
          recordsStatus.set('ready');
          return nextRecords;
        })
        .catch((error) => {
          if (requestVersion === recordsVersion) {
            recordsStatus.set('error');
            recordsRequest = undefined;
          }
          throw error;
        });
    }
    try {
      return await recordsRequest;
    } catch {
      return get(loadedRecords);
    }
  }

  async function loadRemoteResults(currentQuery: string, scope: SearchScope, requestId: number): Promise<void> {
    const currentOptions = get(options);
    remoteResults.set([]);
    remoteStatus.set('loading');
    remoteError.set('');
    try {
      const fetcher = currentOptions.fetcher ?? globalThis.fetch;
      if (!fetcher) throw new Error(currentOptions.t('search.fetchUnavailable'));
      const response = await fetcher(createSearchUrl(currentOptions.endpoint, currentQuery, scope, currentOptions.provider, currentOptions.origin));
      if (!response.ok) throw new Error(currentOptions.t('search.requestError', { status: response.status }));
      const payload = await response.json() as { results?: SearchResult[] };
      if (requestId !== remoteRequestId) return;
      remoteResults.set(payload.results ?? []);
      remoteStatus.set('ready');
    } catch (error) {
      if (requestId !== remoteRequestId) return;
      remoteResults.set([]);
      remoteError.set(error instanceof Error ? error.message : currentOptions.t('search.failed'));
      remoteStatus.set('error');
    }
  }

  function syncRemoteResults(): void {
    const currentOptions = get(options);
    const currentQuery = get(query);
    if (!get(open) || !currentQuery.trim() || !isRemoteSearch(currentOptions)) return;
    const nextKey = createRemoteKey(currentOptions.provider, currentOptions.endpoint, currentQuery, currentOptions.scope);
    if (nextKey === remoteKey) return;
    remoteKey = nextKey;
    void loadRemoteResults(currentQuery, currentOptions.scope, ++remoteRequestId);
  }

  return {
    open,
    query,
    activeIndex,
    results,
    remoteStatus,
    remoteError,
    recordsStatus,
    setOptions,
    show,
    hide,
    setQuery,
    moveActive,
    activate,
    select,
    ensureRecords
  };
}

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

  function setOptions(nextOptions: Partial<SvedocsAskAiControllerOptions>): void {
    const recordsChanged = Object.hasOwn(nextOptions, 'records') && nextOptions.records !== recordsSource;
    const loadRecordsChanged = Object.hasOwn(nextOptions, 'loadRecords') && nextOptions.loadRecords !== loadRecordsSource;
    options.update((current) => normalizeAskOptions({ ...current, ...nextOptions }));
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
  }

  function reset(): void {
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

    const transcript = get(messages)
      .filter((message) => !message.welcome && !(message.role === 'assistant' && message.id === assistantMsg.id))
      .map((message) => ({ role: message.role, content: message.content }));

    if (currentOptions.buildMode !== 'edge') {
      const sourceRecords = await ensureRecords();
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
        body: JSON.stringify({
          question: value,
          messages: transcript,
          ...currentOptions.scope
        })
      });

      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        await readAskStream(response, assistantMsg.id, currentOptions.t);
        if (!response.ok && !findMessage(assistantMsg.id)?.error) {
          throw new Error(currentOptions.t('ask.requestError', { status: response.status }));
        }
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
      updateAssistant(assistantMsg.id, {
        content: result.answer ?? '',
        citations: result.citations ?? []
      });
    } catch (requestError) {
      const sourceRecords = await ensureRecords();
      const fallbackCitations = rankRecords(sourceRecords, value.toLowerCase(), currentOptions.scope).slice(0, 3).map((result) => ({
        title: result.title,
        url: result.url,
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
      loading.set(false);
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
      url: result.url,
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
    messages.update((current) => current.map((message) => (message.id === id ? { ...message, citations } : message)));
  }

  function setError(id: number, error: string): void {
    messages.update((current) => current.map((message) => (message.id === id ? { ...message, error } : message)));
  }

  function rankRecords(records: SvedocsSearchRecord[], query: string, scope: SearchScope): SearchResult[] {
    return searchRecords(records, { query, limit: 5, ...scope });
  }

  async function readAskStream(response: Response, assistantId: number, t: SvedocsTranslate): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = findAskEventBoundary(buffer);
      while (boundary) {
        readAskEvent(buffer.slice(0, boundary.index), assistantId, t);
        buffer = buffer.slice(boundary.index + boundary.length);
        boundary = findAskEventBoundary(buffer);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) readAskEvent(buffer, assistantId, t);
  }

  function findAskEventBoundary(value: string): { index: number; length: number } | undefined {
    const match = /\r\n\r\n|\n\n|\r\r/.exec(value);
    return match ? { index: match.index, length: match[0].length } : undefined;
  }

  function readAskEvent(block: string, assistantId: number, t: SvedocsTranslate): void {
    const normalized = block.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const event = /^event:\s*(.+)$/m.exec(normalized)?.[1] ?? 'message';
    const data = normalized.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data || data === '[DONE]') return;
    try {
      const payload = JSON.parse(data) as {
        answer?: string;
        delta?: string;
        content?: string;
        citations?: SvedocsAskAiCitation[];
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
      if (event === 'chunks') setCitations(assistantId, normalizeChunkCitations(payload.chunks ?? [], t));
      if (event === 'citations') setCitations(assistantId, payload.citations ?? []);
      if (event === 'error') setError(assistantId, payload.error ?? t('ask.failed'));
    } catch {
      setError(assistantId, t('ask.streamUnreadable'));
    }
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

export function createTocController(initial: { page: SvedocsPage }): SvedocsTocController {
  const activeHeading = writable(initial.page.headings[0]?.id ?? '');
  const indicatorTop = writable(0);
  const indicatorHeight = writable(0);
  const indicatorReady = writable(false);
  let page = initial.page;
  let tocEl: HTMLElement | null = null;
  let headingFrame: number | undefined;
  let stopHeadingTracking: (() => void) | undefined;
  let headingTrackingVersion = 0;
  let mounted = false;

  function setPage(nextPage: SvedocsPage): void {
    if (page === nextPage) return;
    page = nextPage;
    activeHeading.set(page.headings[0]?.id ?? '');
    indicatorReady.set(false);
    if (mounted) void attachHeadingTracker();
  }

  function setContainer(element: HTMLElement | null): void {
    tocEl = element;
    const id = get(activeHeading);
    if (id) void updateIndicator(id);
  }

  function activate(id: string): void {
    activeHeading.set(id);
    void updateIndicator(id);
  }

  function mount(): () => void {
    mounted = true;
    void attachHeadingTracker();
    return destroy;
  }

  function destroy(): void {
    mounted = false;
    headingTrackingVersion += 1;
    stopHeadingTracking?.();
    stopHeadingTracking = undefined;
    cancelHeadingFrame();
  }

  async function attachHeadingTracker(): Promise<void> {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const version = headingTrackingVersion + 1;
    headingTrackingVersion = version;
    stopHeadingTracking?.();
    stopHeadingTracking = undefined;
    cancelHeadingFrame();
    indicatorReady.set(false);
    activeHeading.set(page.headings[0]?.id ?? '');
    await tick();
    if (version !== headingTrackingVersion) return;
    const headings = page.headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (headings.length === 0) return;
    const syncActiveHeading = () => {
      headingFrame = undefined;
      const nextHeading = getActiveHeading(headings);
      if (nextHeading) {
        activeHeading.set(nextHeading.id);
        void updateIndicator(nextHeading.id);
      }
    };
    const scheduleActiveHeadingSync = () => {
      if (headingFrame !== undefined) return;
      headingFrame = requestAnimationFrame(syncActiveHeading);
    };
    window.addEventListener('scroll', scheduleActiveHeadingSync, { passive: true });
    window.addEventListener('resize', scheduleActiveHeadingSync);
    stopHeadingTracking = () => {
      window.removeEventListener('scroll', scheduleActiveHeadingSync);
      window.removeEventListener('resize', scheduleActiveHeadingSync);
    };
    scheduleActiveHeadingSync();
  }

  async function updateIndicator(id: string): Promise<void> {
    await tick();
    if (!tocEl) return;
    const link = tocEl.querySelector<HTMLElement>(`a.sd-toc-link[href="#${cssEscape(id)}"]`);
    if (!link) return;
    const markerHeight = Math.min(24, Math.max(16, link.offsetHeight - 12));
    const atBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 2;
    const isLastLink = !link.nextElementSibling || !link.nextElementSibling.matches('a.sd-toc-link');
    if (atBottom && isLastLink) {
      const paddingBottom = parseFloat(getComputedStyle(tocEl).paddingBottom) || 0;
      indicatorTop.set(tocEl.scrollHeight - paddingBottom - markerHeight);
    } else {
      indicatorTop.set(link.offsetTop + (link.offsetHeight - markerHeight) / 2);
    }
    indicatorHeight.set(markerHeight);
    indicatorReady.set(true);
  }

  function cancelHeadingFrame(): void {
    if (headingFrame === undefined) return;
    cancelAnimationFrame(headingFrame);
    headingFrame = undefined;
  }

  return {
    activeHeading,
    indicatorTop,
    indicatorHeight,
    indicatorReady,
    setPage,
    setContainer,
    activate,
    mount,
    destroy
  };
}

export function createThemeModeController(defaultMode: 'light' | 'dark' | 'system' = 'system'): SvedocsThemeModeController {
  const mode = writable<'light' | 'dark'>('light');
  const preference = writable<'light' | 'dark' | 'system'>(defaultMode);
  let media: MediaQueryList | undefined;

  function resolveMode(nextPreference: 'light' | 'dark' | 'system'): 'light' | 'dark' {
    if (nextPreference !== 'system') return nextPreference;
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyResolvedMode(nextMode: 'light' | 'dark'): void {
    mode.set(nextMode);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = nextMode;
      document.documentElement.style.colorScheme = nextMode;
    }
  }

  function setPreference(nextPreference: 'light' | 'dark' | 'system'): void {
    preference.set(nextPreference);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('svedocs-theme', nextPreference);
    }
    applyResolvedMode(resolveMode(nextPreference));
  }

  function apply(nextMode: 'light' | 'dark'): void {
    setPreference(nextMode);
  }

  function toggle(): void {
    apply(get(mode) === 'dark' ? 'light' : 'dark');
  }

  function syncFromSystem(): void {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('svedocs-theme') : undefined;
    const nextPreference = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : defaultMode;
    preference.set(nextPreference);
    applyResolvedMode(resolveMode(nextPreference));
  }

  function syncFromMedia(): void {
    if (get(preference) === 'system') applyResolvedMode(resolveMode('system'));
  }

  function mount(): () => void {
    const current = typeof document !== 'undefined' ? document.documentElement.dataset.theme : undefined;
    mode.set(current === 'dark' ? 'dark' : 'light');
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', syncFromMedia);
    }
    syncFromSystem();
    return () => media?.removeEventListener('change', syncFromMedia);
  }

  return {
    mode,
    preference,
    apply,
    setPreference,
    toggle,
    mount
  };
}

export function createMobileNavController(): SvedocsMobileNavController {
  const open = writable(false);

  function toggle(): void {
    open.update((value) => !value);
  }

  function close(): void {
    open.set(false);
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close();
  }

  return {
    open,
    toggle,
    close,
    handleWindowKeydown
  };
}

export function createPageToolsController(config: SvedocsResolvedConfig): SvedocsPageToolsController {
  const scrolled = writable(false);
  const aiEnabled = config.ai.enabled;
  const visible = derived(scrolled, ($scrolled) => aiEnabled || $scrolled);
  const mode = derived(scrolled, (): 'pill' | 'solo' => (aiEnabled ? 'pill' : 'solo'));
  const aiCollapsed = derived(scrolled, ($scrolled) => aiEnabled && $scrolled);

  function openAskAi(): void {
    if (!aiEnabled || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('svedocs:open-ai'));
  }

  function backToTop(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function mount(): () => void {
    if (typeof window === 'undefined') return () => undefined;
    function updateScrolled() {
      scrolled.set(window.scrollY > 240);
    }
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }

  return {
    scrolled,
    visible,
    mode,
    aiCollapsed,
    openAskAi,
    backToTop,
    mount
  };
}

export async function copyTextToClipboard(source: string): Promise<void> {
  await navigator.clipboard.writeText(source.trim());
}

export async function copyCodeToClipboard(button: HTMLButtonElement, source: string, copiedLabel = 'Copied', idleLabel = 'Copy code'): Promise<void> {
  try {
    await copyTextToClipboard(source);
    button.dataset.state = 'copied';
    button.innerHTML = checkIconSvg;
    button.setAttribute('aria-label', copiedLabel);
    window.setTimeout(() => {
      button.dataset.state = 'idle';
      button.innerHTML = copyIconSvg;
      button.setAttribute('aria-label', idleLabel);
    }, 1600);
  } catch {
    button.dataset.state = 'error';
  }
}

export function createDefaultSearchResults(records: SvedocsSearchRecord[], scope: SearchScope): SearchResult[] {
  return filterSearchRecords(records, scope).slice(0, 6).map((record) => ({
    id: record.id,
    title: record.title,
    url: record.url,
    ...(record.section ? { section: record.section } : {}),
    excerpt: record.content.slice(0, 150),
    score: 0.1,
    metadata: record.metadata
  }));
}

export function createSearchUrl(endpoint: string, query: string, scope: SearchScope, provider: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const url = new URL(endpoint, base);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '8');
  url.searchParams.set('provider', provider);
  if (scope.locale) url.searchParams.set('locale', scope.locale);
  if (scope.kind) url.searchParams.set('kind', scope.kind);
  return url.toString();
}

function isRemoteSearch(options: Required<Pick<SvedocsSearchControllerOptions, 'provider' | 'buildMode'>>): boolean {
  return options.buildMode === 'edge' && options.provider !== 'local' && options.provider !== 'local-json';
}

function normalizeSearchOptions(options: SvedocsSearchControllerOptions): Required<Omit<SvedocsSearchControllerOptions, 'loadRecords' | 'fetcher' | 'origin'>> & Pick<SvedocsSearchControllerOptions, 'loadRecords' | 'fetcher' | 'origin'> {
  return {
    records: options.records ?? [],
    scope: options.scope ?? {},
    provider: options.provider ?? 'local',
    endpoint: options.endpoint ?? '/api/search',
    buildMode: options.buildMode ?? 'edge',
    t: options.t ?? fallbackTranslate,
    ...(options.loadRecords ? { loadRecords: options.loadRecords } : {}),
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
    ...(options.origin ? { origin: options.origin } : {})
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

function createRemoteKey(provider: string, endpoint: string, query: string, scope: SearchScope): string {
  return JSON.stringify([provider, endpoint, query.trim(), scope.locale, scope.kind]);
}

function normalizeChunkCitations(chunks: Array<{ title?: string; url?: string; metadata?: Record<string, unknown>; item?: { title?: string; metadata?: Record<string, unknown> } }>, t: SvedocsTranslate): SvedocsAskAiCitation[] {
  return chunks.slice(0, 5).map((chunk, index) => {
    const metadata = normalizeSvedocsMetadata({ ...(chunk.item?.metadata ?? {}), ...(chunk.metadata ?? {}) });
    const section = stringValue(metadata.section);
    return {
      title: stringValue(chunk.title) ?? stringValue(chunk.item?.title) ?? stringValue(metadata.title) ?? t('ask.sourceTitle', { index: index + 1 }),
      url: stringValue(chunk.url) ?? stringValue(metadata.url) ?? stringValue(metadata.source_url) ?? '#',
      ...(section ? { section } : {})
    };
  });
}

function normalizeSvedocsMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
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

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

function getActiveHeading(headings: HTMLElement[]): HTMLElement | undefined {
  const viewportTop = 80;
  const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
  const snapshots = headings.map((heading) => ({
    element: heading,
    top: heading.getBoundingClientRect().top
  }));
  const visible = snapshots.filter((heading) => heading.top >= viewportTop && heading.top <= viewportBottom);
  if (visible.length > 0) {
    return visible.reduce((lowest, heading) => heading.top > lowest.top ? heading : lowest).element;
  }
  return snapshots.filter((heading) => heading.top < viewportTop).at(-1)?.element ?? snapshots[0]?.element;
}

function isPathMatch(currentPath: string, hrefPath: string): boolean {
  if (hrefPath === '/') return currentPath === '/';
  return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`);
}

function getPathname(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      return new URL(path).pathname;
    } catch {
      return path;
    }
  }

  return path.split(/[?#]/, 1)[0] || '/';
}

function decodePathSegment(segment: string | undefined): string | undefined {
  if (!segment) return undefined;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function createComparableUrl(value: string, base: string): string | undefined {
  try {
    const url = new URL(value, base);
    url.pathname = normalizePath(url.pathname);
    return url.href;
  } catch {
    return undefined;
  }
}
