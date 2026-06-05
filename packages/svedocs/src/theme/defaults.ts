import Article from './Article.svelte';
import AskAiPanel from './AskAiPanel.svelte';
import Footer from './Footer.svelte';
import MobileNav from './MobileNav.svelte';
import Navbar from './Navbar.svelte';
import PageTools from './PageTools.svelte';
import RootLayout from './RootLayout.svelte';
import SearchDialog from './SearchDialog.svelte';
import SidebarTree from './SidebarTree.svelte';
import TableOfContents from './TableOfContents.svelte';
import ThemeToggle from './ThemeToggle.svelte';
import type { SvedocsThemeComponentMap } from './types.js';

export const defaultThemeComponents: SvedocsThemeComponentMap = {
  Root: RootLayout,
  Navbar,
  MobileNav,
  Sidebar: SidebarTree,
  Article,
  Toc: TableOfContents,
  Search: SearchDialog,
  AskAi: AskAiPanel,
  Footer,
  ThemeToggle,
  PageTools
};

export function resolveThemeComponents(
  components: Partial<SvedocsThemeComponentMap> = {}
): SvedocsThemeComponentMap {
  return {
    ...defaultThemeComponents,
    ...components
  };
}
