import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createBrowserSearchAdapter } from '../src/search/client';
import { prepareSearchIndex, searchRecords } from '../src/search/local';
import { createSearchControllerWithAdapter } from '../src/theme/controllers/search-controller';
import { createAskAiControllerWithAdapter } from '../src/theme/controllers/ask-controller';
import { resolveSvedocsConfig } from '../src/core/config';
import type { SvedocsSearchRecord } from '../src/core/types';
import type { SearchWorkerRequest, SearchWorkerResponse } from '../src/search/client-types';

const records: SvedocsSearchRecord[] = [
  { id: 'a', pageId: 'a', title: 'Configuration', content: 'Configuration theme options and examples.', url: '/docs/configuration', metadata: { locale: 'en', kind: 'doc' } },
  { id: 'b', pageId: 'b', title: '安装与配置', content: '安装文档和主题配置。', url: '/docs/zh/configuration', metadata: { locale: 'zh', kind: 'doc' } }
];
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<SearchWorkerResponse>) => void) | undefined;
  onerror: (() => void) | undefined;
  records: SvedocsSearchRecord[] = [];
  queries: string[] = [];
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
    queueMicrotask(() => this.reply({ type: 'online' }));
  }
  reply(data: SearchWorkerResponse) { this.onmessage?.({ data } as MessageEvent<SearchWorkerResponse>); }
  postMessage(message: SearchWorkerRequest) {
    if (message.type === 'records') this.records.push(...message.records);
    if (message.type === 'query') {
      this.queries.push(message.query.query);
      this.reply({ type: 'result', id: message.id, results: searchRecords(this.records, message.query) });
    }
  }
  terminate() { this.terminated = true; }
}

describe('browser local search', () => {
  it('shares initialization, coalesces pending queries, and releases the last consumer', async () => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    const search = createBrowserSearchAdapter();
    const ask = createBrowserSearchAdapter();
    const initializing = search.prepare!(records);
    const stale = search.search(records, { query: 'con' });
    const staleResult = expect(stale).rejects.toMatchObject({ name: 'AbortError' });
    const latest = search.search(records, { query: 'configuration', locale: 'en' });
    const ai = ask.search(records, { query: '安装', locale: 'zh' });
    await vi.waitFor(() => expect(FakeWorker.instances[0]?.records).toHaveLength(2));
    const worker = FakeWorker.instances[0]!;
    worker.reply({ type: 'ready' });
    await initializing;
    await staleResult;
    expect(await latest).toEqual(searchRecords(records, { query: 'configuration', locale: 'en' }));
    expect(await ai).toEqual(searchRecords(records, { query: '安装', locale: 'zh' }));
    expect(worker.queries).toEqual(['configuration', '安装']);
    expect(FakeWorker.instances).toHaveLength(1);
    search.release!();
    expect(worker.terminated).toBe(false);
    ask.release!();
    expect(worker.terminated).toBe(true);
  });

  it('falls back when Workers are unavailable or fail after initialization', async () => {
    vi.stubGlobal('Worker', undefined);
    const fallback = createBrowserSearchAdapter();
    expect(await fallback.search(records, { query: 'theme' })).toEqual(searchRecords(records, { query: 'theme' }));
    fallback.release!();
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    const client = createBrowserSearchAdapter();
    const ready = client.prepare!(records);
    await vi.waitFor(() => expect(FakeWorker.instances[0]?.records).toHaveLength(2));
    FakeWorker.instances[0]!.reply({ type: 'ready' });
    await ready;
    FakeWorker.instances[0]!.onerror!();
    expect(await client.search(records, { query: '配置' })).toEqual(searchRecords(records, { query: '配置' }));
    client.release!();
  });

  it('retains ranking with asynchronous preparation and concurrent preparation calls', async () => {
    const next = records.map((record) => ({ ...record }));
    await Promise.all([prepareSearchIndex(next), prepareSearchIndex(next)]);
    for (const query of ['configuration', 'configuration options', '安装', '配置']) {
      expect(searchRecords(next, { query })).toEqual(searchRecords(records, { query }));
    }
  });

  it('replaces an initializing data source without accepting its stale results', async () => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    const client = createBrowserSearchAdapter();
    const stale = expect(client.search(records, { query: 'configuration' })).rejects.toMatchObject({ name: 'AbortError' });
    const replacement = records.map((record) => ({ ...record, id: `new-${record.id}` }));
    const latest = client.search(replacement, { query: '配置', locale: 'zh' });
    await stale;
    await vi.waitFor(() => expect(FakeWorker.instances[1]?.records).toHaveLength(2));
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
    FakeWorker.instances[1]!.reply({ type: 'ready' });
    expect(await latest).toEqual(searchRecords(replacement, { query: '配置', locale: 'zh' }));
    client.release!();
  });

  it('falls back when a Worker never acknowledges startup', async () => {
    vi.useFakeTimers();
    const terminate = vi.fn();
    vi.stubGlobal('Worker', class { terminate = terminate; });
    const client = createBrowserSearchAdapter();
    try {
      const results = client.search(records, { query: 'configuration' });
      await vi.advanceTimersByTimeAsync(5000);
      expect(await results).toEqual(searchRecords(records, { query: 'configuration' }));
      expect(terminate).toHaveBeenCalledOnce();
    } finally { client.release!(); vi.useRealTimers(); }
  });
});

describe('async theme controllers', () => {
  it('ignores stale queries and results arriving after closing or changing the data source', async () => {
    const pending: Array<(results: ReturnType<typeof searchRecords>) => void> = [];
    const local = { search: vi.fn(() => new Promise<ReturnType<typeof searchRecords>>((resolve) => pending.push(resolve))), release: vi.fn() };
    const controller = createSearchControllerWithAdapter({ records }, local);
    controller.show();
    controller.setQuery('old');
    controller.setQuery('new');
    pending[1]!([ { id: 'new', title: 'New', url: '/new', excerpt: '', score: 1, metadata: {} } ]);
    await Promise.resolve();
    pending[0]!([ { id: 'old', title: 'Old', url: '/old', excerpt: '', score: 1, metadata: {} } ]);
    await Promise.resolve();
    expect(get(controller.results)[0]?.id).toBe('new');
    controller.setQuery('closing');
    controller.hide();
    pending[2]!([]);
    await Promise.resolve();
    expect(get(controller.query)).toBe('');
    expect(local.release).toHaveBeenCalled();
    controller.destroy!();
  });

  it('does not load or rank local records for successful remote search; falls back on failure', async () => {
    const local = { search: vi.fn(searchRecords) };
    const loadRecords = vi.fn(async () => records);
    const fetcher = vi.fn(async () => Response.json({ results: [] }));
    const controller = createSearchControllerWithAdapter({ provider: 'algolia', buildMode: 'edge', loadRecords, fetcher }, local);
    controller.show();
    controller.setQuery('configuration');
    await vi.waitFor(() => expect(get(controller.remoteStatus)).toBe('ready'));
    expect(local.search).not.toHaveBeenCalled();
    expect(loadRecords).not.toHaveBeenCalled();
    fetcher.mockImplementationOnce(async () => { throw new Error('Offline'); });
    controller.setQuery('theme');
    await vi.waitFor(() => expect(get(controller.remoteStatus)).toBe('error'));
    await vi.waitFor(() => expect(get(controller.results)).toHaveLength(1));
    expect(loadRecords).toHaveBeenCalledOnce();
    controller.destroy!();
  });

  it('discards Ask AI local responses after conversation reset', async () => {
    let resolve!: (results: ReturnType<typeof searchRecords>) => void;
    const local = { search: vi.fn(() => new Promise<ReturnType<typeof searchRecords>>((done) => { resolve = done; })) };
    const controller = createAskAiControllerWithAdapter({ config: resolveSvedocsConfig({}), buildMode: 'static', records }, local);
    const send = controller.send('configuration');
    await vi.waitFor(() => expect(local.search).toHaveBeenCalled());
    controller.reset();
    resolve(searchRecords(records, { query: 'configuration' }));
    await send;
    expect(get(controller.messages).every((message) => message.welcome)).toBe(true);
    expect(get(controller.loading)).toBe(false);
    controller.destroy!();
  });
});
