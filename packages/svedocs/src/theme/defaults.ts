import Article from './Article.svelte';
import AskAiPanel from './AskAiPanel.svelte';
import Brand from './Brand.svelte';
import DocsLayout from './DocsLayout.svelte';
import DocsShell from './DocsShell.svelte';
import ErrorPage from './ErrorPage.svelte';
import Footer from './Footer.svelte';
import FooterLinks from './FooterLinks.svelte';
import HomePage from './HomePage.svelte';
import LayoutShell from './LayoutShell.svelte';
import MobileNav from './MobileNav.svelte';
import Navbar from './Navbar.svelte';
import PageLayout from './PageLayout.svelte';
import PageShell from './PageShell.svelte';
import PageTools from './PageTools.svelte';
import RenderError from './RenderError.svelte';
import RootLayout from './RootLayout.svelte';
import SearchDialog from './SearchDialog.svelte';
import SidebarTree from './SidebarTree.svelte';
import SocialNav from './SocialNav.svelte';
import TableOfContents from './TableOfContents.svelte';
import ThemeToggle from './ThemeToggle.svelte';
import TopNav from './TopNav.svelte';
import type { SvedocsThemeComponentMap } from './types.js';

export const defaultThemeComponents: SvedocsThemeComponentMap = {
  Root: RootLayout,
  Layout: LayoutShell,
  Docs: DocsLayout,
  DocsShell,
  Page: PageLayout,
  PageShell,
  Home: HomePage,
  Error: ErrorPage,
  Brand,
  TopNav,
  Header: Navbar,
  Navbar,
  MobileNav,
  SocialNav,
  Sidebar: SidebarTree,
  Article,
  Toc: TableOfContents,
  Search: SearchDialog,
  AskAi: AskAiPanel,
  Footer,
  FooterLinks,
  ThemeToggle,
  PageTools,
  RenderError
};

export function resolveThemeComponents(
  components: Partial<SvedocsThemeComponentMap> = {}
): SvedocsThemeComponentMap {
  return {
    ...defaultThemeComponents,
    ...components
  };
}
