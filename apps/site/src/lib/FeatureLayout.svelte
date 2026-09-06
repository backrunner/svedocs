<script lang="ts">
  import { RootLayout } from 'svedocs/theme';
  import type { SvedocsCustomLayoutProps } from 'svedocs/theme/types';
  let { page, config, context, pages = [], tree = [], search = [], content, loadSearch, themeComponents = {} }: SvedocsCustomLayoutProps = $props();
</script>

<RootLayout {config} {page} {pages} {tree} {search} {loadSearch} {themeComponents}>
  <main id="content" class="sd-page sd-feature-page">
    <section class="sd-page-hero">
      <p class="sd-kicker">{context.localeCode === 'zh' ? '自定义布局' : 'Custom layout'}</p>
      <h1>{page.title}</h1>
      {#if page.description}
        <p>{page.description}</p>
      {/if}
    </section>
    <section class="sd-prose">
      {#if content}
        {@const Content = content}
        <Content />
      {:else}
        {@html page.html}
      {/if}
    </section>
  </main>
</RootLayout>
