import { prepareSearchIndex, searchRecords } from './local.js';
import type { SvedocsSearchRecord } from '../core/types.js';
import type { SearchWorkerRequest, SearchWorkerResponse } from './client-types.js';

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<SearchWorkerRequest>) => void;
  postMessage(message: SearchWorkerResponse): void;
};
const records: SvedocsSearchRecord[] = [];
scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'records') records.push(...message.records);
  if (message.type === 'prepare') {
    void prepareSearchIndex(records, false).then(() => scope.postMessage({ type: 'ready' }))
      .catch((error) => scope.postMessage({ type: 'error', message: String(error) }));
  }
  if (message.type === 'query') {
    try {
      scope.postMessage({ type: 'result', id: message.id, results: searchRecords(records, message.query) });
    } catch (error) {
      scope.postMessage({ type: 'error', message: String(error) });
    }
  }
};
scope.postMessage({ type: 'online' });
