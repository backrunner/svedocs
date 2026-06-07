<script lang="ts">
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createThemeContext } from './headless.js';
  import LayoutShell from './LayoutShell.svelte';
  import PageShell from './PageShell.svelte';
  import RootLayout from './RootLayout.svelte';
  import SafeRenderError from './SafeRenderError.svelte';
  import type { SvedocsPageShellAction } from './types.js';
  import type { SvedocsThemeComponentMap } from './types.js';

  export let status: number | undefined = undefined;
  export let message = '';
  export let error: Error | { message?: string } | null | undefined = undefined;
  export let path = '';
  export let config: SvedocsResolvedConfig;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  $: Root = themeComponents.Root ?? RootLayout;
  $: fallbackComponents = { ...themeComponents, Root: RootLayout, Layout: LayoutShell, PageShell };
  $: code = status ?? 500;
  $: title = code === 404 ? 'Page not found' : 'Something went wrong';
  $: detail = message || error?.message || (code === 404
    ? 'The page you are looking for is not in this documentation set.'
    : 'The docs shell is still available while this page recovers.');
  $: docsEntry = pages.find((page) => page.kind === 'doc' && page.routePath === '/docs')
    ?? pages.find((page) => page.kind === 'doc');
  $: Shell = themeComponents.PageShell ?? PageShell;
  $: context = createThemeContext({ config, pages, tree, search, ...(loadSearch ? { loadSearch } : {}) });
  $: actions = [
    { label: 'Home', href: '/', primary: true },
    ...(docsEntry ? [{ label: 'Docs', href: docsEntry.routePath }] : [])
  ] as SvedocsPageShellAction[];
</script>

<svelte:boundary>
  <svelte:component
    this={Root}
    {config}
    {pages}
    {tree}
    {search}
    {loadSearch}
    {themeComponents}
    headTitle={`${code} ${title} - ${config.site.title}`}
    headDescription={detail}
    headRobots="noindex"
    mobileTree={tree}
    mobileCurrentPath={path}
  >
    <svelte:component
      this={Shell}
      variant="error"
      status={code}
      {path}
      {actions}
      {title}
      description={detail}
      {context}
      {themeComponents}
    />
  </svelte:component>
  {#snippet failed(fallbackError, reset)}
    <RootLayout
      {config}
      {pages}
      {tree}
      {search}
      {loadSearch}
      themeComponents={fallbackComponents}
      headTitle={`${code} ${title} - ${config.site.title}`}
      headDescription={detail}
      headRobots="noindex"
      mobileTree={tree}
      mobileCurrentPath={path}
    >
      <main id="content" class="sd-route-render-error" data-theme-component="route-render-error">
        <SafeRenderError
          component={themeComponents.RenderError}
          error={fallbackError}
          {reset}
          {context}
          tree={tree}
          variant="layout"
          label="Error page issue"
          title="The error page could not render"
          message="A custom error page component failed while rendering. The default site shell is still available."
        />
      </main>
    </RootLayout>
  {/snippet}
</svelte:boundary>
