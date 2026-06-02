<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  import type { SvedocsSearchRecord } from '../core/types.js';
  import { filterSearchRecords, searchRecords } from '../search/local.js';
  import type { SearchResult, SearchScope } from '../search/types.js';
  import { portal } from './portal.js';

  export let records: SvedocsSearchRecord[] = [];
  export let loadRecords: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let scope: SearchScope = {};
  export let provider = 'local';
  export let endpoint = '/api/search';
  export let buildMode = 'edge';

  let open = false;
  let query = '';
  let activeIndex = 0;
  let trigger: HTMLButtonElement | undefined;
  let input: HTMLInputElement | undefined;
  let dialog: HTMLDivElement | undefined;
  let previousFocus: HTMLElement | undefined;
  let remoteResults: SearchResult[] = [];
  let remoteStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  let remoteError = '';
  let remoteKey = '';
  let remoteRequestId = 0;
  let loadedRecords: SvedocsSearchRecord[] = records;
  let recordsStatus: 'idle' | 'loading' | 'ready' | 'error' = records.length > 0 ? 'ready' : 'idle';
  let recordsRequest: Promise<SvedocsSearchRecord[]> | undefined;

  $: if (records.length > 0 && loadedRecords !== records) {
    loadedRecords = records;
    recordsStatus = 'ready';
  }
  $: usesRemoteSearch = buildMode === 'edge' && provider !== 'local' && provider !== 'local-json';
  $: localResults = query.trim()
    ? searchRecords(loadedRecords, { query, limit: 8, ...scope })
    : createDefaultResults(loadedRecords, scope);
  $: results = usesRemoteSearch && query.trim()
    ? remoteStatus === 'error' ? localResults : remoteResults
    : localResults;
  $: activeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));
  $: if (usesRemoteSearch && open && query.trim()) {
    const nextKey = createRemoteKey(provider, endpoint, query, scope);
    if (nextKey !== remoteKey) {
      remoteKey = nextKey;
      void loadRemoteResults(query, scope, ++remoteRequestId);
    }
  }
  $: if (!query.trim()) {
    remoteResults = [];
    remoteStatus = 'idle';
    remoteError = '';
    remoteKey = '';
  }

  function show() {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    open = true;
    void ensureRecords();
    tick().then(() => input?.focus());
  }

  function hide() {
    open = false;
    query = '';
    activeIndex = 0;
    tick().then(() => (previousFocus ?? trigger)?.focus());
  }

  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      show();
    }
    if (event.key === 'Escape' && open) hide();
  }

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      trapFocus(event, dialog);
    }
    if (event.key === 'Escape') {
      hide();
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, results.length - 1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    }
    if (event.key === 'Enter' && results[activeIndex]) {
      void goto(results[activeIndex].url, { keepFocus: false });
      hide();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('svedocs:open-search', show);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('svedocs:open-search', show);
    };
  });

  async function ensureRecords(): Promise<SvedocsSearchRecord[]> {
    if (loadedRecords.length > 0 || !loadRecords) return loadedRecords;
    if (!recordsRequest) {
      recordsStatus = 'loading';
      recordsRequest = loadRecords()
        .then((nextRecords) => {
          loadedRecords = nextRecords;
          recordsStatus = 'ready';
          return nextRecords;
        })
        .catch((error) => {
          recordsStatus = 'error';
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

  async function loadRemoteResults(query: string, scope: SearchScope, requestId: number) {
    remoteResults = [];
    remoteStatus = 'loading';
    remoteError = '';
    try {
      const response = await fetch(createSearchUrl(endpoint, query, scope, provider));
      if (!response.ok) throw new Error(`Search returned ${response.status}.`);
      const payload = await response.json() as { results?: SearchResult[] };
      if (requestId !== remoteRequestId) return;
      remoteResults = payload.results ?? [];
      remoteStatus = 'ready';
    } catch (error) {
      if (requestId !== remoteRequestId) return;
      remoteResults = [];
      remoteError = error instanceof Error ? error.message : 'Search failed.';
      remoteStatus = 'error';
    }
  }

  function createDefaultResults(records: SvedocsSearchRecord[], scope: SearchScope): SearchResult[] {
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

  function createSearchUrl(endpoint: string, query: string, scope: SearchScope, provider: string): string {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '8');
    url.searchParams.set('provider', provider);
    if (scope.locale) url.searchParams.set('locale', scope.locale);
    if (scope.kind) url.searchParams.set('kind', scope.kind);
    return url.toString();
  }

  function createRemoteKey(provider: string, endpoint: string, query: string, scope: SearchScope): string {
    return JSON.stringify([provider, endpoint, query.trim(), scope.locale, scope.kind]);
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
</script>

<button bind:this={trigger} class="sd-search-trigger" type="button" aria-label="Search documentation" aria-haspopup="dialog" aria-expanded={open} on:click={show}>
  <span>Search</span>
  <kbd>⌘K</kbd>
</button>

{#if open}
  <div class="sd-dialog-portal" use:portal>
  <div class="sd-dialog-backdrop" role="presentation" on:click={hide}></div>
  <div
    bind:this={dialog}
    class="sd-search-dialog"
    role="dialog"
    aria-modal="true"
    aria-label="Search documentation"
    tabindex="-1"
    on:keydown={handleDialogKeydown}
  >
    <label class="sd-search-box">
      <span class="sd-visually-hidden">Search query</span>
      <input bind:this={input} bind:value={query} placeholder="Search docs" />
    </label>
    <div class="sd-search-results" role="listbox" aria-label="Search results">
      {#if remoteStatus === 'loading'}
        <p class="sd-empty-state">Searching...</p>
      {/if}
      {#if recordsStatus === 'loading' && !usesRemoteSearch}
        <p class="sd-empty-state">Loading search index...</p>
      {/if}
      {#if recordsStatus === 'error' && !usesRemoteSearch}
        <p class="sd-empty-state">Search index could not be loaded.</p>
      {/if}
      {#if remoteError}
        <p class="sd-empty-state">{remoteError} Showing local results.</p>
      {/if}
      {#if results.length > 0}
        {#each results as result, index}
          <a
            class:sd-active={index === activeIndex}
            href={result.url}
            role="option"
            aria-selected={index === activeIndex}
            on:mouseenter={() => (activeIndex = index)}
            on:click={hide}
          >
            <span>{result.section ?? result.title}</span>
            {#if result.section}
              <small>{result.title}</small>
            {/if}
            <p>{result.excerpt}</p>
          </a>
        {/each}
      {:else if remoteStatus !== 'loading' && recordsStatus !== 'loading'}
        <p class="sd-empty-state">No matching docs yet.</p>
      {/if}
    </div>
  </div>
  </div>
{/if}
