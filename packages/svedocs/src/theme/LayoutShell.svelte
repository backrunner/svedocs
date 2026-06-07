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
  <a class="sd-skip" href="#content">Skip to content</a>
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
        label="Header issue"
        title="Header could not render"
        message="The page is still available below. You can retry the header or use links inside the content."
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
        />
        {#snippet failed(error, reset)}
          <svelte:component
            this={ErrorComponent} component={themeComponents.RenderError}
            {error}
            {reset}
            {context}
            variant="tools"
            label="Ask AI issue"
            title="Ask AI could not render"
            message="The article is still available. Retry Ask AI when you need it."
          />
        {/snippet}
      </svelte:boundary>
    {/if}
    <svelte:boundary>
      <svelte:component this={PageToolsComponent} config={context.config} />
      {#snippet failed(error, reset)}
        <svelte:component
          this={ErrorComponent} component={themeComponents.RenderError}
          {error}
          {reset}
          {context}
          variant="tools"
          label="Page tools issue"
          title="Page tools could not render"
          message="The page tools failed to render. The document content is unaffected."
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
        label="Footer issue"
        title="Footer could not render"
        message="Footer links failed to render. The page content above is still available."
      />
    {/snippet}
  </svelte:boundary>
</div>
