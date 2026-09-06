export type * from './controllers/types.js';
import type { SvedocsSearchController, SvedocsAskAiController, SvedocsTocController, SvedocsPageToolsController } from './controllers/types.js';
import type { Component } from 'svelte';
import type {
  SvedocsLocale,
  SvedocsMessages,
  SvedocsPage,
  SvedocsResolvedConfig,
  SvedocsSearchRecord,
  SvedocsTranslate,
  SvedocsTreeItem
} from '../core/types.js';
import type { SearchScope } from '../search/types.js';

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
  page?: SvedocsPage | undefined;
  pages: SvedocsPage[];
  tree: SvedocsTreeItem[];
  search: SvedocsSearchRecord[];
  loadSearch?: SvedocsRecordLoader | undefined;
  searchScope: SearchScope;
  aiScope: SearchScope;
  surface: SvedocsThemeSurface;
  isDocsPage: boolean;
  activeNavHref: string;
  locale?: SvedocsLocale;
  localeCode: string;
  languageTag: string;
  messages: SvedocsMessages;
  t: SvedocsTranslate;
}

export interface SvedocsAppProps {
  page: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  config: SvedocsResolvedConfig;
  components?: Record<string, Component>;
  content?: Component | undefined;
  layout?: Component<SvedocsCustomLayoutProps> | undefined;
  layouts?: Record<string, Component>;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
  loadSearch?: SvedocsRecordLoader | undefined;
}

export interface SvedocsCustomLayoutProps extends SvedocsDocsLayoutProps {
  context: SvedocsThemeContext;
}

export interface SvedocsDocsLayoutProps {
  context?: SvedocsThemeContext | undefined;
  page: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  config: SvedocsResolvedConfig;
  loadSearch?: SvedocsRecordLoader | undefined;
  content?: SvedocsContentComponent;
  hasBackgroundSlot?: boolean;
  hasDocHeaderSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsPageLayoutProps {
  context?: SvedocsThemeContext | undefined;
  page: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  config: SvedocsResolvedConfig;
  loadSearch?: SvedocsRecordLoader | undefined;
  content?: SvedocsContentComponent;
  hasBackgroundSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsHomeLayoutProps {
  context?: SvedocsThemeContext | undefined;
  page: SvedocsPage;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  config: SvedocsResolvedConfig;
  loadSearch?: SvedocsRecordLoader | undefined;
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
  loadSearch?: SvedocsRecordLoader | undefined;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsRootProps {
  context?: SvedocsThemeContext | undefined;
  config: SvedocsResolvedConfig;
  page?: SvedocsPage | undefined;
  localeCode?: string;
  pages?: SvedocsPage[];
  tree?: SvedocsTreeItem[];
  search?: SvedocsSearchRecord[];
  loadSearch?: SvedocsRecordLoader | undefined;
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
  page?: SvedocsPage | undefined;
  variant?: SvedocsPageShellVariant;
  title?: string;
  description?: string;
  kicker?: string;
  content?: SvedocsContentComponent;
  html?: string;
  status?: number;
  path?: string;
  actions?: SvedocsPageShellAction[];
  context?: SvedocsThemeContext | undefined;
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
  context?: SvedocsThemeContext | undefined;
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
  context?: SvedocsThemeContext | undefined;
  hasDocHeaderSlot?: boolean;
  themeComponents?: Partial<SvedocsThemeComponentMap>;
}

export interface SvedocsRenderErrorProps {
  error?: unknown;
  reset?: (() => void) | undefined;
  title?: string | undefined;
  message?: string | undefined;
  label?: string | undefined;
  variant?: SvedocsRenderErrorVariant | string;
  page?: SvedocsPage | undefined;
  context?: SvedocsThemeContext | undefined;
  tree?: SvedocsTreeItem[];
}

export interface SvedocsTocProps {
  page: SvedocsPage;
  controller?: SvedocsTocController;
  context?: SvedocsThemeContext | undefined;
}

export interface SvedocsSearchProps {
  records?: SvedocsSearchRecord[];
  loadRecords?: SvedocsRecordLoader | undefined;
  scope?: SearchScope;
  provider?: string;
  endpoint?: string;
  buildMode?: SvedocsResolvedConfig['build']['mode'] | string;
  controller?: SvedocsSearchController;
  context?: SvedocsThemeContext | undefined;
}

export interface SvedocsAskAiProps {
  config: SvedocsResolvedConfig;
  records?: SvedocsSearchRecord[];
  loadRecords?: SvedocsRecordLoader | undefined;
  scope?: SearchScope;
  endpoint?: string;
  buildMode?: SvedocsResolvedConfig['build']['mode'];
  controller?: SvedocsAskAiController;
  context?: SvedocsThemeContext | undefined;
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
  context?: SvedocsThemeContext | undefined;
}

export interface SvedocsPageToolsProps {
  config: SvedocsResolvedConfig;
  controller?: SvedocsPageToolsController;
  context?: SvedocsThemeContext | undefined;
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
