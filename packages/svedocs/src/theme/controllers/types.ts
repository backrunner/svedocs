import type { Readable, Writable } from 'svelte/store';
import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTranslate } from '../../core/types.js';
import type { SearchResult, SearchScope } from '../../search/types.js';
import type { SvedocsRecordLoader } from '../types.js';

export interface SvedocsSearchController {
  open: Writable<boolean>;
  query: Writable<string>;
  activeIndex: Writable<number>;
  results: Readable<SearchResult[]>;
  remoteStatus: Writable<'idle' | 'loading' | 'ready' | 'error'>;
  remoteError: Writable<string>;
  recordsStatus: Writable<'idle' | 'loading' | 'ready' | 'error'>;
  setOptions(options: Partial<SvedocsSearchControllerOptions>): void;
  show(): void;
  hide(): void;
  setQuery(value: string): void;
  moveActive(delta: number): void;
  activate(index: number): void;
  select(index?: number): SearchResult | undefined;
  ensureRecords(): Promise<SvedocsSearchRecord[]>;
  destroy?(): void;
}

export interface SvedocsSearchControllerOptions {
  records?: SvedocsSearchRecord[];
  loadRecords?: SvedocsRecordLoader | undefined;
  scope?: SearchScope;
  provider?: string;
  endpoint?: string;
  buildMode?: string;
  fetcher?: typeof fetch;
  origin?: string;
  t?: SvedocsTranslate;
}

export type SvedocsAskAiCitation = { title: string; url: string; section?: string };
export type SvedocsAskAiRole = 'user' | 'assistant';

export interface SvedocsAskAiMessage {
  id: number;
  role: SvedocsAskAiRole;
  content: string;
  citations?: SvedocsAskAiCitation[];
  error?: string;
  welcome?: boolean;
}

export interface SvedocsAskAiController {
  open: Writable<boolean>;
  input: Writable<string>;
  messages: Writable<SvedocsAskAiMessage[]>;
  loading: Writable<boolean>;
  setOptions(options: Partial<SvedocsAskAiControllerOptions>): void;
  show(): void;
  hide(): void;
  reset(): void;
  setInput(value: string): void;
  send(text?: string): Promise<void>;
  ensureRecords(): Promise<SvedocsSearchRecord[]>;
  destroy?(): void;
}

export interface SvedocsAskAiControllerOptions {
  config: SvedocsResolvedConfig;
  records?: SvedocsSearchRecord[];
  loadRecords?: SvedocsRecordLoader | undefined;
  scope?: SearchScope;
  endpoint?: string;
  buildMode?: SvedocsResolvedConfig['build']['mode'];
  welcomeMessage?: string;
  fetcher?: typeof fetch;
  t?: SvedocsTranslate;
}

export interface SvedocsTocController {
  activeHeading: Writable<string>;
  indicatorTop: Writable<number>;
  indicatorHeight: Writable<number>;
  indicatorReady: Writable<boolean>;
  setPage(page: SvedocsPage): void;
  setContainer(element: HTMLElement | null): void;
  activate(id: string): void;
  mount(): () => void;
  destroy(): void;
}

export interface SvedocsThemeModeController {
  mode: Writable<'light' | 'dark'>;
  preference: Writable<'light' | 'dark' | 'system'>;
  apply(mode: 'light' | 'dark'): void;
  setPreference(preference: 'light' | 'dark' | 'system'): void;
  toggle(): void;
  mount(): () => void;
}

export interface SvedocsMobileNavController {
  open: Writable<boolean>;
  toggle(): void;
  close(): void;
  handleWindowKeydown(event: KeyboardEvent): void;
}

export interface SvedocsPageToolsController {
  scrolled: Writable<boolean>;
  visible: Readable<boolean>;
  mode: Readable<'pill' | 'solo'>;
  aiCollapsed: Readable<boolean>;
  openAskAi(): void;
  backToTop(): void;
  mount(): () => void;
}
