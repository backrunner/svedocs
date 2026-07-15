<script lang="ts">
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createPageTree } from '../core/navigation.js';
  import { createThemeContext, resolveLocaleCodeFromPath, resolveLocalizedHref } from './headless.js';
  import LayoutShell from './LayoutShell.svelte';
  import PageShell from './PageShell.svelte';
  import RootLayout from './RootLayout.svelte';
  import SafeRenderError from './SafeRenderError.svelte';
  import ThemeInit from './ThemeInit.svelte';
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
  $: localeCode = resolveLocaleCodeFromPath(path, config);
  $: localePages = pages.filter((page) => (page.locale ?? config.i18n.defaultLocale ?? 'en') === localeCode);
  $: localeTree = createPageTree(localePages);
  $: navigationTree = localeTree.length > 0 ? localeTree : tree;
  $: context = createThemeContext({ config, pages, tree: navigationTree, search, localeCode, ...(loadSearch ? { loadSearch } : {}) });
  $: title = code === 404 ? context.t('error.notFound.title') : context.t('error.generic.title');
  $: detail = code === 404
    ? context.t('error.notFound.description')
    : message || error?.message || context.t('error.generic.description');
  $: homeHref = resolveLocalizedHref('/', context);
  $: docsHref = resolveLocalizedHref('/docs', context);
  $: docsEntry = localePages.find((page) => page.kind === 'doc' && page.routePath === docsHref)
    ?? localePages.find((page) => page.kind === 'doc');
  $: Shell = themeComponents.PageShell ?? PageShell;
  $: actions = [
    { label: context.t('error.home'), href: homeHref, primary: true },
    ...(docsEntry ? [{ label: context.t('error.docs'), href: docsEntry.routePath }] : [])
  ] as SvedocsPageShellAction[];
</script>

{#if Root !== RootLayout}
  <ThemeInit
    defaultMode={config.theme.defaultMode}
    languageTag={context.languageTag}
    dir={context.locale?.dir ?? 'ltr'}
  />
{/if}

<svelte:boundary>
  <svelte:component
    this={Root}
    {config}
    {localeCode}
    {pages}
    tree={navigationTree}
    {search}
    {loadSearch}
    {themeComponents}
    headTitle={`${code} ${title} - ${config.site.title}`}
    headDescription={detail}
    headRobots="noindex"
    mobileTree={navigationTree}
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
      {localeCode}
      {pages}
      tree={navigationTree}
      {search}
      {loadSearch}
      themeComponents={fallbackComponents}
      headTitle={`${code} ${title} - ${config.site.title}`}
      headDescription={detail}
      headRobots="noindex"
      mobileTree={navigationTree}
      mobileCurrentPath={path}
    >
      <main id="content" class="sd-route-render-error" data-theme-component="route-render-error">
        <SafeRenderError
          component={themeComponents.RenderError}
          error={fallbackError}
          {reset}
          {context}
          tree={navigationTree}
          variant="layout"
          label={context.t('render.error.label')}
          title={context.t('render.error.title')}
          message={context.t('render.error.message')}
        />
      </main>
    </RootLayout>
  {/snippet}
</svelte:boundary>
