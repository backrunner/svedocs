import type { SvedocsSearchRecord } from '../core/types.js';
import type { SearchQuery, SearchResult } from './types.js';

export interface LocalSearchAdapter {
  search(records: SvedocsSearchRecord[], query: SearchQuery): SearchResult[] | Promise<SearchResult[]>;
  prepare?(records: SvedocsSearchRecord[]): Promise<void>;
  release?(): void;
}

export type SearchWorkerRequest =
  | { type: 'records'; records: SvedocsSearchRecord[] }
  | { type: 'prepare' }
  | { type: 'query'; id: number; query: SearchQuery };

export type SearchWorkerResponse =
  | { type: 'online' | 'ready' }
  | { type: 'result'; id: number; results: SearchResult[] }
  | { type: 'error'; message: string };
