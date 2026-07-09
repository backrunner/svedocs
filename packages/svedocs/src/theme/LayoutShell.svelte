<script lang="ts">
  import type { SvedocsTreeItem } from '../core/types.js';
  import AskAiPanel from './AskAiPanel.svelte';
  import Footer from './Footer.svelte';
  import Navbar from './Navbar.svelte';
  import PageTools from './PageTools.svelte';
  import SafeRenderError from './SafeRenderError.svelte';
  import type { SvedocsThemeComponentMap, SvedocsThemeContext } from './types.js';

  export let context: SvedocsThemeContext;
  export let themeStyle = '';
  export let mobileTree: SvedocsTreeItem[] = [];
  export let mobileCurrentPath = '';
  export let mobileMenuId = 'sd-mobile-menu-site';
  export let mobileMenuOpen = false;
  export let hasBackgroundSlot = false;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};
  export let onToggleMobileMenu: () => void = () => undefined;
  export let onCloseMobileMenu: () => void = () => undefined;

  $: NavbarComponent = themeComponents.Header ?? themeComponents.Navbar ?? Navbar;
  $: AskAiComponent = themeComponents.AskAi ?? AskAiPanel;
  $: FooterComponent = themeComponents.Footer ?? Footer;
  $: PageToolsComponent = themeComponents.PageTools ?? PageTools;
  $: ErrorComponent = SafeRenderError;
</script>

<div class:sd-has-background-slot={hasBackgroundSlot} class="sd-root" data-surface={context.surface} style={themeStyle} data-theme-component="layout">
  <a class="sd-skip" href="#content">{context.t('nav.skipToContent')}</a>
  {#if hasBackgroundSlot}
    <div class="sd-background-slot" aria-hidden="true">
      <slot name="background" />
    </div>
  {/if}
  <svelte:boundary>
    <svelte:component
      this={NavbarComponent}
      {context}
      {mobileTree}
      mobileCurrentPath={mobileCurrentPath}
      {mobileMenuId}
      {mobileMenuOpen}
      {themeComponents}
      {onToggleMobileMenu}
      {onCloseMobileMenu}
    />
    {#snippet failed(error, reset)}
      <svelte:component
        this={ErrorComponent} component={themeComponents.RenderError}
        {error}
        {reset}
        {context}
        tree={context.tree}
        variant="layout"
        label={context.t('render.header.label')}
        title={context.t('render.header.title')}
        message={context.t('render.header.message')}
      />
    {/snippet}
  </svelte:boundary>
  <slot />
  {#if context.isDocsPage}
    {#if context.config.ai.enabled}
      <svelte:boundary>
        <svelte:component
          this={AskAiComponent}
          config={context.config}
          records={context.search}
          loadRecords={context.loadSearch}
          scope={context.aiScope}
          buildMode={context.config.build.mode}
          {context}
        />
        {#snippet failed(error, reset)}
          <svelte:component
            this={ErrorComponent} component={themeComponents.RenderError}
            {error}
            {reset}
            {context}
            variant="tools"
            label={context.t('render.ask.label')}
            title={context.t('render.ask.title')}
            message={context.t('render.ask.message')}
          />
        {/snippet}
      </svelte:boundary>
    {/if}
    <svelte:boundary>
      <svelte:component this={PageToolsComponent} config={context.config} {context} />
      {#snippet failed(error, reset)}
        <svelte:component
          this={ErrorComponent} component={themeComponents.RenderError}
          {error}
          {reset}
          {context}
          variant="tools"
          label={context.t('render.tools.label')}
          title={context.t('render.tools.title')}
          message={context.t('render.tools.message')}
        />
      {/snippet}
    </svelte:boundary>
  {/if}
  <svelte:boundary>
    <svelte:component this={FooterComponent} {context} {themeComponents} />
    {#snippet failed(error, reset)}
      <svelte:component
        this={ErrorComponent} component={themeComponents.RenderError}
        {error}
        {reset}
        {context}
        variant="layout"
        label={context.t('render.footer.label')}
        title={context.t('render.footer.title')}
        message={context.t('render.footer.message')}
      />
    {/snippet}
  </svelte:boundary>
</div>
