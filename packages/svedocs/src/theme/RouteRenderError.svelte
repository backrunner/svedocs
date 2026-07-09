<script lang="ts">
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createThemeContext } from './headless.js';
  import SafeRenderError from './SafeRenderError.svelte';
  import RootLayout from './RootLayout.svelte';
  import type { SvedocsThemeComponentMap } from './types.js';

  export let error: unknown = undefined;
  export let reset: (() => void) | undefined = undefined;
  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};
  export let label: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let message: string | undefined = undefined;

  $: context = createThemeContext({ config, page, pages, tree, search, ...(loadSearch ? { loadSearch } : {}) });
  $: resolvedLabel = label ?? context.t('render.page.label');
  $: resolvedTitle = title ?? context.t('render.page.title');
  $: resolvedMessage = message ?? context.t('render.page.message');
</script>

<svelte:component
  this={RootLayout}
  {config}
  {page}
  {pages}
  {tree}
  {search}
  {loadSearch}
  {themeComponents}
  mobileTree={tree}
  mobileCurrentPath={page.routePath}
>
  <main id="content" class="sd-route-render-error" data-theme-component="route-render-error">
    <svelte:component
      this={SafeRenderError} component={themeComponents.RenderError}
      {error}
      {reset}
      {page}
      {context}
      tree={tree}
      variant="layout"
      label={resolvedLabel}
      title={resolvedTitle}
      message={resolvedMessage}
    />
  </main>
</svelte:component>
