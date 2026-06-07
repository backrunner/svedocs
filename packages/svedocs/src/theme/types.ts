import type { Component } from 'svelte';
import type { Readable, Writable } from 'svelte/store';
import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
import type { SearchResult, SearchScope } from '../search/types.js';

export type SvedocsContentComponent = Component | undefined;
export type SvedocsThemeSurface = 'home' | 'reading';
export type SvedocsRecordLoader = () => Promise<SvedocsSearchRecord[]>;
export type SvedocsPageShellVariant = 'page' | 'error';
export type SvedocsPageShellAction = {
  label: string;
  href: string;
  primary?: boolean;
  external?: boolean;
};
export type SvedocsRenderErrorVariant = 'layout' | 'article' | 'content' | 'navigation' | 'tools' | 'section';

export interface SvedocsThemeContext {
  config: SvedocsResolvedConfig;
  page?: SvedocsPage;
  pages: SvedocsPage[];
  tree: SvedocsTreeItem[];
  search: SvedocsSearchRecord[];
  loadSearch?: SvedocsRecordLoader;
  searchScope: SearchScope;
  aiScope: SearchScope;
  surface: SvedocsThemeSurface;
  isDocsPage: boolean;
  activeNavHref: string;
}

export interface SvedocsAppProps {
  page: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  config: SvedocsResolvedConfig;
  components?: Record<string, Component>;
  layouts?: Record<string, Component>;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
  loadSearch?: SvedocsRecordLoader;
}

export interface SvedocsDocsLayoutProps {
  page: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  config: SvedocsResolvedConfig;
  loadSearch?: SvedocsRecordLoader;
  content?: SvedocsContentComponent;
  hasBackgroundSlot?: boolean;
  hasDocHeaderSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsPageLayoutProps {
  page: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  config: SvedocsResolvedConfig;
  loadSearch?: SvedocsRecordLoader;
  content?: SvedocsContentComponent;
  hasBackgroundSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsHomeLayoutProps {
  page: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  config: SvedocsResolvedConfig;
  loadSearch?: SvedocsRecordLoader;
  content?: SvedocsContentComponent;
  hasBackgroundSlot?: boolean;
  hasLandingSlot?: boolean;
  hasHomeHeroVisualSlot?: boolean;
  hasHomeFeaturesSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsErrorProps {
  status?: number;
  message?: string;
  error?: Error | { message?: string } | null;
  path?: string;
  config: SvedocsResolvedConfig;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  loadSearch?: SvedocsRecordLoader;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsRootProps {
  config: SvedocsResolvedConfig;
  page?: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  loadSearch?: SvedocsRecordLoader;
  headTitle?: string;
  headDescription?: string;
  headRobots?: string;
  mobileTree?: SvedocsTreeItem[];
  mobileCurrentPath?: string;
  hasBackgroundSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsLayoutShellProps {
  context: SvedocsThemeContext;
  themeStyle?: string;
  mobileTree?: SvedocsTreeItem[];
  mobileCurrentPath?: string;
  mobileMenuId?: string;
  mobileMenuOpen?: boolean;
  hasBackgroundSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
  onToggleMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
}

export interface SvedocsDocsShellProps {
  page: SvedocsPage;
  navigationTree?: SvedocsTreeItem[];
  content?: SvedocsContentComponent;
  context: SvedocsThemeContext;
  tocController: SvedocsTocController;
  hasDocHeaderSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsPageShellProps {
  page?: SvedocsPage;
  variant?: SvedocsPageShellVariant;
  title?: string;
  description?: string;
  kicker?: string;
  content?: SvedocsContentComponent;
  html?: string;
  status?: number;
  path?: string;
  actions?: SvedocsPageShellAction[];
  context?: SvedocsThemeContext;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsBrandProps {
  context: SvedocsThemeContext;
}

export interface SvedocsTopNavProps {
  context: SvedocsThemeContext;
}

export interface SvedocsNavbarProps {
  context: SvedocsThemeContext;
  mobileTree?: SvedocsTreeItem[];
  mobileCurrentPath?: string;
  mobileMenuId?: string;
  mobileMenuOpen?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
  onToggleMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
}

export type SvedocsHeaderProps = SvedocsNavbarProps;

export interface SvedocsSocialNavProps {
  context: SvedocsThemeContext;
}

export interface SvedocsMobileNavProps {
  items?: SvedocsTreeItem[];
  currentPath?: string;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsSidebarProps {
  items?: SvedocsTreeItem[];
  currentPath?: string;
  depth?: number;
}

export interface SvedocsArticleProps {
  page: SvedocsPage;
  content?: SvedocsContentComponent;
  context?: SvedocsThemeContext;
  hasDocHeaderSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsRenderErrorProps {
  error?: unknown;
  reset?: () => void;
  title?: string;
  message?: string;
  label?: string;
  variant?: SvedocsRenderErrorVariant | string;
  page?: SvedocsPage;
  context?: SvedocsThemeContext;
  tree?: SvedocsTreeItem[];
}

export interface SvedocsTocProps {
  page: SvedocsPage;
  controller?: SvedocsTocController;
}

export interface SvedocsSearchProps {
  records?: SvedocsSearchRecord[];
  loadRecords?: SvedocsRecordLoader;
  scope?: SearchScope;
  provider?: string;
  endpoint?: string;
  buildMode?: SvedocsResolvedConfig['build']['mode'] | string;
  controller?: SvedocsSearchController;
}

export interface SvedocsAskAiProps {
  config: SvedocsResolvedConfig;
  records?: SvedocsSearchRecord[];
  loadRecords?: SvedocsRecordLoader;
  scope?: SearchScope;
  endpoint?: string;
  buildMode?: SvedocsResolvedConfig['build']['mode'];
  controller?: SvedocsAskAiController;
}

export interface SvedocsFooterProps {
  context: SvedocsThemeContext;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsFooterLinksProps {
  context: SvedocsThemeContext;
}

export interface SvedocsThemeToggleProps {
  defaultMode?: SvedocsResolvedConfig['theme']['defaultMode'];
}

export interface SvedocsPageToolsProps {
  config: SvedocsResolvedConfig;
  controller?: SvedocsPageToolsController;
}

export interface SvedocsThemeComponentMap {
  Root: Component<SvedocsRootProps>;
  Layout: Component<SvedocsLayoutShellProps>;
  Docs: Component<SvedocsDocsLayoutProps>;
  DocsShell: Component<SvedocsDocsShellProps>;
  Page: Component<SvedocsPageLayoutProps>;
  PageShell: Component<SvedocsPageShellProps>;
  Home: Component<SvedocsHomeLayoutProps>;
  Error: Component<SvedocsErrorProps>;
  Brand: Component<SvedocsBrandProps>;
  TopNav: Component<SvedocsTopNavProps>;
  Header: Component<SvedocsHeaderProps>;
  Navbar: Component<SvedocsNavbarProps>;
  MobileNav: Component<SvedocsMobileNavProps>;
  SocialNav: Component<SvedocsSocialNavProps>;
  Sidebar: Component<SvedocsSidebarProps>;
  Article: Component<SvedocsArticleProps>;
  Toc: Component<SvedocsTocProps>;
  Search: Component<SvedocsSearchProps>;
  AskAi: Component<SvedocsAskAiProps>;
  Footer: Component<SvedocsFooterProps>;
  FooterLinks: Component<SvedocsFooterLinksProps>;
  ThemeToggle: Component<SvedocsThemeToggleProps>;
  PageTools: Component<SvedocsPageToolsProps>;
  RenderError: Component<SvedocsRenderErrorProps>;
}

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
}

export interface SvedocsSearchControllerOptions {
  records?: SvedocsSearchRecord[];
  loadRecords?: SvedocsRecordLoader;
  scope?: SearchScope;
  provider?: string;
  endpoint?: string;
  buildMode?: string;
  fetcher?: typeof fetch;
  origin?: string;
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
}

export interface SvedocsAskAiControllerOptions {
  config: SvedocsResolvedConfig;
  records?: SvedocsSearchRecord[];
  loadRecords?: SvedocsRecordLoader;
  scope?: SearchScope;
  endpoint?: string;
  buildMode?: SvedocsResolvedConfig['build']['mode'];
  fetcher?: typeof fetch;
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
