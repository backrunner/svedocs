<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, onMount, tick } from 'svelte';
  import type { SvedocsSearchRecord } from '../core/types.js';
  import type { SearchResult, SearchScope } from '../search/types.js';
  import { createSearchController, fallbackTranslate } from './headless.js';
  import { lockDocumentScroll, portal } from './portal.js';
  import type { SvedocsSearchController, SvedocsThemeContext } from './types.js';

  export let records: SvedocsSearchRecord[] = [];
  export let loadRecords: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let scope: SearchScope = {};
  export let provider = 'local';
  export let endpoint = '/api/search';
  export let buildMode = 'edge';
  export let controller: SvedocsSearchController | undefined = undefined;
  export let context: SvedocsThemeContext | undefined = undefined;

  const internalController = createSearchController({ records, loadRecords, scope, provider, endpoint, buildMode });
  let activeController: SvedocsSearchController = internalController;
  let open = false;
  let query = '';
  let activeIndex = 0;
  let results: SearchResult[] = [];
  let remoteStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  let remoteError = '';
  let recordsStatus: 'idle' | 'loading' | 'ready' | 'error' = records.length > 0 ? 'ready' : 'idle';
  let trigger: HTMLButtonElement | undefined;
  let input: HTMLInputElement | undefined;
  let dialog: HTMLDivElement | undefined;
  let previousFocus: HTMLElement | undefined;
  let boundController: SvedocsSearchController | undefined;
  let unsubscribeController: (() => void) | undefined;
  let releaseScrollLock: (() => void) | undefined;

  $: t = context?.t ?? fallbackTranslate;
  $: activeController = controller ?? internalController;
  $: activeController.setOptions({ records, loadRecords, scope, provider, endpoint, buildMode, t });
  $: bindController(activeController);

  function show() {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    activeController.show();
    tick().then(() => input?.focus());
  }

  function hide() {
    activeController.hide();
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
      activeController.moveActive(1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeController.moveActive(-1);
    }
    if (event.key === 'Enter') {
      const result = activeController.select();
      if (result) void goto(result.url, { keepFocus: false });
    }
  }

  function handleInput(event: Event) {
    activeController.setQuery((event.currentTarget as HTMLInputElement).value);
  }

  function bindController(nextController: SvedocsSearchController): void {
    if (boundController === nextController) return;
    unsubscribeController?.();
    boundController = nextController;
    const unsubscribers = [
      nextController.open.subscribe((value) => {
        open = value;
        if (value && !releaseScrollLock) releaseScrollLock = lockDocumentScroll();
        if (!value && releaseScrollLock) {
          releaseScrollLock();
          releaseScrollLock = undefined;
        }
      }),
      nextController.query.subscribe((value) => (query = value)),
      nextController.activeIndex.subscribe((value) => (activeIndex = value)),
      nextController.results.subscribe((value) => (results = value)),
      nextController.remoteStatus.subscribe((value) => (remoteStatus = value)),
      nextController.remoteError.subscribe((value) => (remoteError = value)),
      nextController.recordsStatus.subscribe((value) => (recordsStatus = value))
    ];
    unsubscribeController = () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('svedocs:open-search', show);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('svedocs:open-search', show);
    };
  });

  onDestroy(() => {
    internalController.hide();
    unsubscribeController?.();
    releaseScrollLock?.();
  });

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

<button bind:this={trigger} class="sd-search-trigger" type="button" aria-label={t('search.dialog')} aria-haspopup="dialog" aria-expanded={open} on:click={show} data-theme-component="search-trigger">
  <span>{t('search.trigger')}</span>
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
    aria-label={t('search.dialog')}
    tabindex="-1"
    on:keydown={handleDialogKeydown}
    data-theme-component="search"
  >
    <label class="sd-search-box">
      <span class="sd-visually-hidden">{t('search.query')}</span>
      <input
        value={query}
        placeholder={t('search.placeholder')}
        role="combobox"
        aria-autocomplete="list"
        aria-controls="svedocs-search-results"
        aria-expanded={open}
        aria-activedescendant={results[activeIndex] ? `svedocs-search-option-${activeIndex}` : undefined}
        on:input={handleInput}
        bind:this={input}
      />
    </label>
    <div id="svedocs-search-results" class="sd-search-results" role="listbox" aria-label={t('search.results')}>
      {#if remoteStatus === 'loading'}
        <p class="sd-empty-state">{t('search.loading')}</p>
      {/if}
      {#if recordsStatus === 'loading' && !(buildMode === 'edge' && provider !== 'local' && provider !== 'local-json')}
        <p class="sd-empty-state">{t('search.loadingIndex')}</p>
      {/if}
      {#if recordsStatus === 'error' && !(buildMode === 'edge' && provider !== 'local' && provider !== 'local-json')}
        <p class="sd-empty-state">{t('search.indexError')}</p>
      {/if}
      {#if remoteError}
        <p class="sd-empty-state">{t('search.remoteFallback', { error: remoteError })}</p>
      {/if}
      {#if results.length > 0}
        {#each results as result, index}
          <a
            id={`svedocs-search-option-${index}`}
            class:sd-active={index === activeIndex}
            href={result.url}
            role="option"
            aria-selected={index === activeIndex}
            on:mouseenter={() => activeController.activate(index)}
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
        <p class="sd-empty-state">{t('search.empty')}</p>
      {/if}
    </div>
  </div>
  </div>
{/if}
