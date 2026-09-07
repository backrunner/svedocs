import type { SvedocsSearchRecord } from '../core/types.js';
import type { SearchQuery, SearchResult } from './types.js';
import type { LocalSearchAdapter, SearchWorkerRequest, SearchWorkerResponse } from './client-types.js';

interface SharedSearch {
  refs: number;
  ready: Promise<void>;
  search(query: SearchQuery): Promise<SearchResult[]>;
  destroy(): void;
}

const clients = new WeakMap<SvedocsSearchRecord[], SharedSearch>();
const cancelled = () => new DOMException('Search cancelled', 'AbortError');

/** One index per records identity, shared by mounted search and Ask AI consumers. */
export function createBrowserSearchAdapter(): LocalSearchAdapter {
  let source: SvedocsSearchRecord[] | undefined;
  let shared: SharedSearch | undefined;
  let version = 0;

  function acquire(records: SvedocsSearchRecord[]) {
    if (source === records && shared) return shared;
    release();
    source = records;
    shared = clients.get(records);
    if (!shared) {
      shared = createSharedSearch(records);
      clients.set(records, shared);
    }
    shared.refs += 1;
    return shared;
  }

  function release() {
    version += 1;
    if (shared && --shared.refs === 0) {
      shared.destroy();
      if (source) clients.delete(source);
    }
    shared = undefined;
    source = undefined;
  }

  return {
    prepare: (records) => records.length ? acquire(records).ready : Promise.resolve(),
    async search(records, query) {
      if (!records.length) return [];
      const client = acquire(records);
      const request = ++version;
      await client.ready;
      // Coalesce keystrokes while the index is being built.
      if (request !== version) throw cancelled();
      const results = await client.search(query);
      if (request !== version) throw cancelled();
      return results;
    },
    release
  };
}

function createSharedSearch(records: SvedocsSearchRecord[]): SharedSearch {
  let worker: Worker | undefined;
  let destroyed = false;
  let failed = false;
  let nextId = 0;
  let fallback: Promise<typeof import('./local.js')> | undefined;
  const pending = new Map<number, { resolve(value: SearchResult[]): void; reject(error: unknown): void }>();
  let readyResolve: () => void;
  let readyReject: (error: unknown) => void;
  const workerReady = new Promise<void>((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  let startupTimer: ReturnType<typeof setTimeout> | undefined;

  function fail(error: unknown) {
    if (failed) return;
    failed = true;
    clearTimeout(startupTimer);
    worker?.terminate();
    worker = undefined;
    readyReject(error);
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  }

  function local() {
    fallback ??= import('./local.js').then(async (module) => {
      if (destroyed) throw cancelled();
      await module.prepareSearchIndex(records);
      return module;
    });
    return fallback;
  }

  const ready = workerReady.catch(async () => {
    if (destroyed) throw cancelled();
    await local();
  });
  // Closing a dialog can release an index before anyone awaits its initialization.
  void ready.catch(() => {});

  try {
    if (typeof Worker === 'undefined') throw new Error('Workers unavailable');
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    startupTimer = setTimeout(() => fail(new Error('Search worker did not start')), 5000);
    worker.onerror = () => fail(new Error('Search worker failed'));
    worker.onmessageerror = () => fail(new Error('Invalid search worker message'));
    worker.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'online') {
        clearTimeout(startupTimer);
        void initialize().catch(fail);
      } else if (message.type === 'ready') readyResolve();
      else if (message.type === 'error') fail(new Error(message.message));
      else if (message.type === 'result') {
        pending.get(message.id)?.resolve(message.results);
        pending.delete(message.id);
      }
    };
  } catch (error) { fail(error); }

  function post(message: SearchWorkerRequest) {
    if (!worker || destroyed) throw cancelled();
    worker.postMessage(message);
  }

  async function initialize() {
    // Bound structured-clone work on the UI thread, including large documentation sets.
    let started = performance.now();
    for (let offset = 0; offset < records.length; offset += 16) {
      post({ type: 'records', records: records.slice(offset, offset + 16) });
      if (performance.now() - started >= 8) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        started = performance.now();
      }
    }
    post({ type: 'prepare' });
  }

  return {
    refs: 0,
    ready,
    async search(query) {
      if (destroyed) throw cancelled();
      if (failed) return (await local()).searchRecords(records, query);
      try {
        return await new Promise<SearchResult[]>((resolve, reject) => {
          const id = ++nextId;
          pending.set(id, { resolve, reject });
          const { signal: _signal, ...input } = query;
          try { post({ type: 'query', id, query: input }); }
          catch (error) { fail(error); }
        });
      } catch (error) {
        if (destroyed) throw error;
        return (await local()).searchRecords(records, query);
      }
    },
    destroy() {
      destroyed = true;
      fail(cancelled());
    }
  };
}
