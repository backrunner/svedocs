import { loadContentSnapshot, type ContentOptions } from './content.js';
import type { SvedocsPage } from './types.js';

export interface CachedContentPage {
  raw: string;
  page: SvedocsPage;
  dependencies: Set<string>;
  version: number;
}

export interface ContentCache {
  contextKey: string;
  pages: Map<string, CachedContentPage>;
  themeDependencies: Set<string>;
  revision: number;
}

export function createContentSession() {
  const cache: ContentCache = { contextKey: '', pages: new Map(), themeDependencies: new Set(), revision: 0 };
  let versions = new Map<string, number>();
  return {
    async load(options: ContentOptions, changed?: Set<string>) {
      const snapshot = await loadContentSnapshot(options, cache, changed);
      versions = new Map([...cache.pages.values()].map((entry) => [entry.page.id, entry.version]));
      return snapshot;
    },
    invalidate() { cache.contextKey = ''; },
    version(id: string) {
      return versions.get(id) ?? -1;
    },
    dependencies() {
      return new Set([...cache.themeDependencies, ...[...cache.pages.values()].flatMap((entry) => [...entry.dependencies])]);
    }
  };
}
