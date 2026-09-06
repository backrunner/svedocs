export * from './core/routes.js';

import type { Component } from 'svelte';
import type { SvedocsPage } from './core/types.js';
import type { SvedocsCustomLayoutProps } from './theme/types.js';

export interface SvedocsLoadedPage {
  page: SvedocsPage;
  content: Component | undefined;
  layout: Component<SvedocsCustomLayoutProps> | undefined;
}

export type SvedocsModuleLoader<T> = () => Promise<{ default: T }>;

/** Resolve only the current page's data, content component and named layout. */
export async function loadSvedocsPage(
  page: SvedocsPage,
  loaders: {
    pages: Record<string, SvedocsModuleLoader<SvedocsPage | undefined>>;
    components?: Record<string, SvedocsModuleLoader<Component>>;
    layouts?: Record<string, SvedocsModuleLoader<Component<SvedocsCustomLayoutProps>>>;
  }
): Promise<SvedocsLoadedPage> {
  const layoutName = typeof page.frontmatter.layout === 'string' ? page.frontmatter.layout : '';
  const [data, content, layout] = await Promise.all([
    loaders.pages[page.id]?.(),
    loaders.components?.[page.id]?.(),
    loaders.layouts?.[layoutName]?.()
  ]);
  if (layoutName && !['home', 'docs', 'page'].includes(layoutName) && !layout) {
    throw new Error(`Unknown layout ${JSON.stringify(layoutName)} for ${page.routePath}. Register it in svedocs({ layouts }).`);
  }
  return { page: data?.default ?? page, content: content?.default, layout: layout?.default };
}
