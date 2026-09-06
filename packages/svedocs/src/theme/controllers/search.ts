import { derived, get, writable } from 'svelte/store';
import { filterSearchRecords, searchRecords } from '../../search/local.js';
import { sanitizeNavigationUrl } from '../../search/utils.js';
import type { SvedocsSearchRecord } from '../../core/types.js';
import type { SearchResult, SearchScope } from '../../search/types.js';
import type { SvedocsSearchController, SvedocsSearchControllerOptions } from '../types.js';
import { fallbackTranslate } from './context.js';

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
  let remoteAbort: AbortController | undefined;
  let remoteTimer: ReturnType<typeof setTimeout> | undefined;

  const usesRemoteSearch = derived(options, ($options) => isRemoteSearch($options));
  const localResults = derived([query, loadedRecords, options], ([$query, $records, $options]) => (
    $query.trim()
      ? searchRecords($records, { query: $query, limit: 8, ...$options.scope }).map(sanitizeSearchResult)
      : createDefaultSearchResults($records, $options.scope).map(sanitizeSearchResult)
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
    cancelRemoteRequest();
  }

  function setQuery(value: string): void {
    query.set(value);
    activeIndex.set(0);
    if (!value.trim()) {
      remoteResults.set([]);
      remoteStatus.set('idle');
      remoteError.set('');
      remoteKey = '';
      cancelRemoteRequest();
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

  async function loadRemoteResults(currentQuery: string, scope: SearchScope, requestId: number, signal: AbortSignal): Promise<void> {
    const currentOptions = get(options);
    remoteResults.set([]);
    remoteStatus.set('loading');
    remoteError.set('');
    try {
      const fetcher = currentOptions.fetcher ?? globalThis.fetch;
      if (!fetcher) throw new Error(currentOptions.t('search.fetchUnavailable'));
      const response = await fetcher(createSearchUrl(currentOptions.endpoint, currentQuery, scope, currentOptions.provider, currentOptions.origin), { signal });
      if (!response.ok) throw new Error(currentOptions.t('search.requestError', { status: response.status }));
      const payload = await response.json() as { results?: SearchResult[] };
      if (requestId !== remoteRequestId) return;
      remoteResults.set((payload.results ?? []).map(sanitizeSearchResult));
      remoteStatus.set('ready');
    } catch (error) {
      if (requestId !== remoteRequestId || signal.aborted) return;
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
    cancelRemoteRequest();
    const requestId = ++remoteRequestId;
    remoteTimer = setTimeout(() => {
      remoteTimer = undefined;
      remoteAbort = new AbortController();
      void loadRemoteResults(currentQuery, currentOptions.scope, requestId, remoteAbort.signal);
    }, 150);
  }

  function cancelRemoteRequest(): void {
    if (remoteTimer) clearTimeout(remoteTimer);
    remoteTimer = undefined;
    remoteAbort?.abort();
    remoteAbort = undefined;
    remoteRequestId += 1;
  }

  function sanitizeSearchResult(result: SearchResult): SearchResult {
    return { ...result, url: sanitizeNavigationUrl(result.url) };
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

function createRemoteKey(provider: string, endpoint: string, query: string, scope: SearchScope): string {
  return JSON.stringify([provider, endpoint, query.trim(), scope.locale, scope.kind]);
}
