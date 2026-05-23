<script lang="ts">
  import type { Component } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord } from '../core/types.js';
  import RootLayout from './RootLayout.svelte';

  export let page: SvedocsPage;
  export let pages: SvedocsPage[] = [];
  export let search: SvedocsSearchRecord[] = [];
  export let config: SvedocsResolvedConfig;
  export let content: Component | undefined = undefined;

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

  const homePillars = [
    {
      label: 'Svelte',
      title: 'Native authoring',
      description: 'Write docs, routes, and interactive examples with the same SvelteKit mental model.',
      glyph: '1011\n1101\n0110\n1011',
      match: /intro|component|content|mdx|svx/i,
      fallback: '/docs'
    },
    {
      label: 'Lightweight',
      title: 'One lean package',
      description: 'Keep rendering, theme, SEO, search, and adapters integrated without plugin sprawl.',
      glyph: '0110\n1111\n1001\n0110',
      match: /configuration|api|theme/i,
      fallback: '/docs/configuration'
    },
    {
      label: 'Integration',
      title: 'Search and AI ready',
      description: 'Connect local search, Algolia, Typesense, or Cloudflare AI Search behind one contract.',
      glyph: '1010\n0101\n1010\n0101',
      match: /search|ai/i,
      fallback: '/docs/search-ai'
    },
    {
      label: 'Edge First',
      title: 'Deploy near readers',
      description: 'Build for Cloudflare Pages by default, with static output and SPA fallback when needed.',
      glyph: '1111\n1001\n1001\n1111',
      match: /cloudflare|deploy|edge/i,
      fallback: '/docs/cloudflare'
    }
  ] as const;

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
  $: docPages = pages.filter((item) => item.kind === 'doc');
  $: docs = docPages.slice(0, 4);
  $: homeCards = createHomeCards(pages);
  $: primaryDoc = docPages[0];
  $: secondaryDoc = docPages.find((doc) => /configuration|config/i.test(doc.routePath)) ?? docPages[1];
  $: primaryAction = config.theme.home.primaryAction ?? (
    primaryDoc ? { label: 'Read docs', href: primaryDoc.routePath } : { label: 'Read docs', href: page.routePath }
  );
  $: secondaryAction = config.theme.home.secondaryAction ?? (
    secondaryDoc ? { label: secondaryDoc.title, href: secondaryDoc.routePath } : undefined
  );

  function createHomeCards(pages: SvedocsPage[]): HomeCard[] {
    const docs = pages.filter((candidate) => candidate.kind === 'doc');
    const fallbackDoc = docs[0];

    return homePillars.map((pillar) => {
      const target = docs.find((candidate) => pillar.match.test(`${candidate.title} ${candidate.routePath}`));
      const fallbackTarget = docs.find((candidate) => candidate.routePath === pillar.fallback);

      return {
        label: pillar.label,
        title: pillar.title,
        description: pillar.description,
        glyph: pillar.glyph,
        href: target?.routePath ?? fallbackTarget?.routePath ?? fallbackDoc?.routePath ?? page.routePath
      };
    });
  }

  function glyphRows(glyph: string): string[][] {
    return glyph.split('\n').map((row) => row.split(''));
  }
</script>

  <RootLayout {config} {page} {pages} {search}>
  <main id="content" class="sd-home">
    <section class="sd-home-hero">
      <span class="sd-home-hero-tape" aria-hidden="true"></span>
      <div class="sd-home-copy">
        <p class="sd-kicker">
          <span class="sd-kicker-mark" aria-hidden="true"></span>
          {config.theme.home.kicker}
        </p>
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
      {#if config.theme.home.visual.type === 'image' && config.theme.home.visual.src}
        <img class="sd-home-visual" src={config.theme.home.visual.src} alt={config.theme.home.visual.alt} />
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
    <section class="sd-home-grid" aria-label="Documentation entry points">
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
    <section class="sd-prose sd-home-body">
      {#if content}
        <svelte:component this={content} />
      {:else}
        {@html page.html}
      {/if}
    </section>
  </main>
</RootLayout>
