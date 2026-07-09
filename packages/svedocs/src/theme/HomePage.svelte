<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsMessageKey, SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord, SvedocsTreeItem } from '../core/types.js';
  import { createThemeContext } from './headless.js';
  import SafeRenderError from './SafeRenderError.svelte';
  import RootLayout from './RootLayout.svelte';
  import type { SvedocsThemeComponentMap } from './types.js';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let tree: SvedocsTreeItem[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let loadSearch: (() => Promise<SvedocsSearchRecord[]>) | undefined = undefined;
  export let content: Component | undefined = undefined;
  export let hasBackgroundSlot: boolean | undefined = undefined;
  export let hasLandingSlot: boolean | undefined = undefined;
  export let hasHomeHeroVisualSlot: boolean | undefined = undefined;
  export let hasHomeFeaturesSlot: boolean | undefined = undefined;
  export let themeComponents: Partial<SvedocsThemeComponentMap> = {};

  interface PixelCell {
    index: number;
    hot: boolean;
    accent: boolean;
    style: string;
  }

  interface HomeCard {
    label: string;
    title: string;
    description: string;
    href: string;
    glyph: string;
  }

  type HomePillarKey = 'start' | 'install' | 'write' | 'integrate';

  const homePillars = [
    {
      key: 'start',
      glyph: '1011\n1101\n0110\n1011',
      match: /quick\s*start|getting-started|index/i,
      fallback: '/docs'
    },
    {
      key: 'install',
      glyph: '0110\n1111\n1001\n0110',
      match: /installation/i,
      fallback: '/docs/installation'
    },
    {
      key: 'write',
      glyph: '1010\n0101\n1010\n0101',
      match: /writing|content|components/i,
      fallback: '/docs/writing'
    },
    {
      key: 'integrate',
      glyph: '1111\n1001\n1001\n1111',
      match: /integrations|search|ai|cloudflare|seo|og/i,
      fallback: '/docs/integrations'
    }
  ] satisfies Array<{
    key: HomePillarKey;
    glyph: string;
    match: RegExp;
    fallback: string;
  }>;

  // Hand-tuned bitmap (14 cols × 9 rows) — pixel-art glyph forming a soft "S" mark
  // with scattered ambient cells. 1 = on, 2 = accent-2 hot, 0 = ambient.
  const heroBitmap = [
    '00011112221100',
    '00111111111110',
    '01110000000110',
    '01111000000000',
    '00111122100000',
    '00000022111100',
    '00000000001110',
    '01100000001110',
    '01111122211100'
  ];

  const cells: PixelCell[] = (() => {
    const result: PixelCell[] = [];
    heroBitmap.forEach((row, y) => {
      const chars = row.split('');
      chars.forEach((ch, x) => {
        const lit = ch !== '0';
        const accent = ch === '2';
        const distance = Math.hypot(x - 6.5, y - 4) / 7;
        const mix = lit ? 78 - Math.floor(distance * 32) : 14 + ((x + y) % 5) * 3;
        const delay = ((x * 73 + y * 41) % 9) * -260;
        result.push({
          index: y * chars.length + x,
          hot: lit,
          accent,
          style: `--mix:${mix}%; --wave-delay:${delay}ms;`
        });
      });
    });
    return result;
  })();
  $: context = createThemeContext({ config, page, pages, tree, search, ...(loadSearch ? { loadSearch } : {}) });
  $: docPages = pages.filter((item) => item.kind === 'doc' && isCurrentLocalePage(item));
  $: homeCards = createHomeCards(docPages);
  $: primaryDoc = docPages[0];
  $: secondaryDoc = docPages.find((doc) => /configuration|config/i.test(doc.routePath)) ?? docPages[1];
  $: primaryAction = config.theme.home.primaryAction ?? (
    primaryDoc
      ? { label: context.t('home.primaryAction'), href: primaryDoc.routePath }
      : { label: context.t('home.primaryAction'), href: page.routePath }
  );
  $: secondaryAction = config.theme.home.secondaryAction ?? (
    secondaryDoc ? { label: secondaryDoc.title, href: secondaryDoc.routePath } : undefined
  );
  $: showBackgroundSlot = hasBackgroundSlot ?? Boolean($$slots.background);
  $: showLandingSlot = hasLandingSlot ?? Boolean($$slots.landing);
  $: showHomeHeroVisualSlot = hasHomeHeroVisualSlot ?? Boolean($$slots['home-hero-visual']);
  $: showHomeFeaturesSlot = hasHomeFeaturesSlot ?? Boolean($$slots['home-features']);
  $: Root = themeComponents.Root ?? RootLayout;
  $: ErrorComponent = SafeRenderError;

  function createHomeCards(docs: SvedocsPage[]): HomeCard[] {
    const fallbackDoc = docs[0];

    return homePillars.map((pillar) => {
      const target = docs.find((candidate) => pillar.match.test(`${candidate.title} ${candidate.routePath}`));
      const fallbackTarget = docs.find((candidate) => candidate.routePath === pillar.fallback);

      return {
        label: context.t(homeMessageKey(pillar.key, 'label')),
        title: context.t(homeMessageKey(pillar.key, 'title')),
        description: context.t(homeMessageKey(pillar.key, 'description')),
        glyph: pillar.glyph,
        href: target?.routePath ?? fallbackTarget?.routePath ?? fallbackDoc?.routePath ?? page.routePath
      };
    });
  }

  function homeMessageKey(key: HomePillarKey, field: 'label' | 'title' | 'description'): SvedocsMessageKey {
    return `home.card.${key}.${field}` as SvedocsMessageKey;
  }

  function isCurrentLocalePage(candidate: SvedocsPage): boolean {
    const candidateLocale = candidate.locale ?? config.i18n.defaultLocale ?? 'en';
    return candidateLocale === context.localeCode;
  }

  function glyphRows(glyph: string): string[][] {
    return glyph.split('\n').map((row) => row.split(''));
  }
</script>

<svelte:component this={Root} {config} {page} {pages} {tree} {search} {loadSearch} hasBackgroundSlot={showBackgroundSlot} {themeComponents}>
  <svelte:fragment slot="background">
    <slot name="background" />
  </svelte:fragment>
  {#if showLandingSlot}
    <main id="content" class="sd-home">
      <slot name="landing" {page} {pages} {tree} {search} {config} {content} {context} />
    </main>
  {:else}
    <main id="content" class="sd-home">
      <section class="sd-home-hero">
        <span class="sd-home-hero-tape" aria-hidden="true"></span>
        <div class="sd-home-copy">
          {#if config.theme.home.kicker}
            <p class="sd-kicker">
              <span class="sd-kicker-mark" aria-hidden="true"></span>
              {config.theme.home.kicker === 'SvelteKit-native docs' ? context.t('home.kicker') : config.theme.home.kicker}
            </p>
          {/if}
          <h1>{page.title}</h1>
          {#if page.description}
            <p>{page.description}</p>
          {/if}
          <div class="sd-actions">
            <a class="sd-button sd-button-primary" href={primaryAction.href}>
              <span>{primaryAction.label}</span>
              <span class="sd-button-arrow" aria-hidden="true"></span>
            </a>
            {#if secondaryAction}
              <a class="sd-button" href={secondaryAction.href}>{secondaryAction.label}</a>
            {/if}
          </div>
        </div>
        {#if showHomeHeroVisualSlot}
          <slot name="home-hero-visual" {page} {pages} {config} {context} />
        {:else if config.theme.home.visual.type === 'image' && config.theme.home.visual.src}
          <img class="sd-home-visual" src={config.theme.home.visual.src} alt={config.theme.home.visual.alt} draggable="false" />
        {:else}
          <div class="sd-pixel-stage" aria-hidden="true">
            <span class="sd-pixel-frame" data-corner="tl"></span>
            <span class="sd-pixel-frame" data-corner="tr"></span>
            <span class="sd-pixel-frame" data-corner="bl"></span>
            <span class="sd-pixel-frame" data-corner="br"></span>
            <div class="sd-pixel-grid">
              {#each cells as cell}
                <span
                  class:sd-pixel-hot={cell.hot}
                  class:sd-pixel-accent={cell.accent}
                  style={cell.style}
                ></span>
              {/each}
            </div>
          </div>
        {/if}
      </section>
      {#if showHomeFeaturesSlot}
        <slot name="home-features" {page} {pages} {config} cards={homeCards} {context} />
      {:else}
        <section class="sd-home-grid" aria-label={context.t('home.features')}>
          {#each homeCards as card, i}
            <a href={card.href} style={`--card-index:${i};`}>
              <span class="sd-home-card-tag">
                <i aria-hidden="true"></i>
                {card.label}
              </span>
              <div class="sd-home-card-glyph" aria-hidden="true">
                {#each glyphRows(card.glyph) as row}
                  <div>
                    {#each row as cell}
                      <i data-on={cell === '1' ? 'true' : 'false'}></i>
                    {/each}
                  </div>
                {/each}
              </div>
              <strong>{card.title}</strong>
              <small>{card.description}</small>
              <span class="sd-home-card-arrow" aria-hidden="true">→</span>
            </a>
          {/each}
        </section>
      {/if}
      <section class="sd-prose sd-home-body">
        <svelte:boundary>
          {#if content}
            <svelte:component this={content} />
          {:else}
            {@html page.html}
          {/if}
          {#snippet failed(error, reset)}
            <svelte:component
              this={ErrorComponent} component={themeComponents.RenderError}
              {error}
              {reset}
              {page}
              {context}
              variant="content"
              label={context.t('render.home.label')}
              title={context.t('render.home.title')}
              message={context.t('render.home.message')}
            />
          {/snippet}
        </svelte:boundary>
      </section>
    </main>
  {/if}
</svelte:component>
