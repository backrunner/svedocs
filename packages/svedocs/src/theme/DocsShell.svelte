<script lang="ts">
  import Article from './Article.svelte';
  import SafeRenderError from './SafeRenderError.svelte';
  import SidebarTree from './SidebarTree.svelte';
  import TableOfContents from './TableOfContents.svelte';
  import type {
    SvedocsContentComponent,
    SvedocsThemeComponentMap,
    SvedocsThemeContext,
    SvedocsTocController
  } from './types.js';
  import type { SvedocsPage, SvedocsTreeItem } from '../core/types.js';

  export let page: SvedocsPage;
  export let navigationTree: SvedocsTreeItem[] = [];
  export let content: SvedocsContentComponent = undefined;
  export let context: SvedocsThemeContext;
  export let tocController: SvedocsTocController;
  export let hasDocHeaderSlot = false;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  $: Sidebar = themeComponents.Sidebar ?? SidebarTree;
  $: ArticleComponent = themeComponents.Article ?? Article;
  $: Toc = themeComponents.Toc ?? TableOfContents;
  $: ErrorComponent = SafeRenderError;
</script>

<div class="sd-doc-shell" data-theme-component="docs-shell">
  <aside class="sd-sidebar" aria-label={context.t('nav.documentation')}>
    <nav>
      <svelte:boundary>
        <svelte:component this={Sidebar} items={navigationTree} currentPath={page.routePath} />
        {#snippet failed(error, reset)}
          <svelte:component
            this={ErrorComponent} component={themeComponents.RenderError}
            {error}
            {reset}
            {page}
            {context}
            tree={navigationTree}
            variant="navigation"
            label={context.t('render.navigation.label')}
            title={context.t('render.navigation.title')}
            message={context.t('render.navigation.message')}
          />
        {/snippet}
      </svelte:boundary>
    </nav>
  </aside>
  <main id="content" class="sd-content">
    <svelte:boundary>
      <svelte:component this={ArticleComponent} {page} {content} {context} {hasDocHeaderSlot} {themeComponents}>
        <svelte:fragment slot="doc-header" let:page let:breadcrumbs>
          <slot name="doc-header" {page} {breadcrumbs} />
        </svelte:fragment>
      </svelte:component>
      {#snippet failed(error, reset)}
        <svelte:component
          this={ErrorComponent} component={themeComponents.RenderError}
          {error}
          {reset}
          {page}
          {context}
          tree={navigationTree}
          variant="article"
          label={context.t('render.article.label')}
          title={context.t('render.article.title')}
          message={context.t('render.article.message')}
        />
      {/snippet}
    </svelte:boundary>
  </main>
  <svelte:boundary>
    <svelte:component this={Toc} {page} controller={tocController} {context} />
    {#snippet failed(error, reset)}
      <aside class="sd-toc" aria-label={context.t('toc.label')}>
        <svelte:component
          this={ErrorComponent} component={themeComponents.RenderError}
          {error}
          {reset}
          {page}
          {context}
          variant="navigation"
          label={context.t('render.outline.label')}
          title={context.t('render.outline.title')}
          message={context.t('render.outline.message')}
        />
      </aside>
    {/snippet}
  </svelte:boundary>
</div>
