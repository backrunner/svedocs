<script lang="ts">
  import { onMount } from 'svelte';
  import type { SvedocsLocale, SvedocsPage } from '../core/types.js';
  import { fallbackTranslate } from './headless.js';
  import type { SvedocsThemeContext } from './types.js';

  export let page: SvedocsPage | undefined = undefined;
  export let pages: SvedocsPage[] = [];
  export let locales: SvedocsLocale[] = [];
  export let context: SvedocsThemeContext | undefined = undefined;

  let openMenu: 'locale' | undefined;
  let root: HTMLDivElement;

  $: localeOptions = createScopeOptions(
    locales,
    page?.locale,
    (locale) => locale.code,
    (locale) => locale.label,
    (locale) => findScopedPage({ locale: locale.code })?.routePath
  );
  $: activeLocaleOption = localeOptions.find((option) => option.current);
  $: t = context?.t ?? fallbackTranslate;
  $: activeLocaleLabel = activeLocaleOption?.label ?? t('scope.locale');
  $: activeLocaleShortLabel = activeLocaleOption
    ? createShortLocaleLabel(activeLocaleOption.value, activeLocaleOption.label)
    : t('scope.langShort');

  function findScopedPage(scope: { locale?: string }): SvedocsPage | undefined {
    if (!page) return undefined;
    return pages.find((candidate) => (
      candidate.scopePath === page.scopePath
      && (scope.locale ? candidate.locale === scope.locale : candidate.locale === page.locale)
    ));
  }

  function createScopeOptions<T>(
    items: T[],
    current: string | undefined,
    getValue: (item: T) => string,
    getLabel: (item: T) => string,
    getPath: (item: T) => string | undefined
  ) {
    return items.map((item) => ({
      value: getValue(item),
      label: getLabel(item),
      path: getPath(item),
      current: getValue(item) === current
    }));
  }

  function createShortLocaleLabel(value: string, label: string) {
    const trimmedLabel = label.trim();
    if ([...trimmedLabel].length <= 3) return trimmedLabel;

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue.slice(0, 3).toUpperCase() : trimmedLabel.slice(0, 3);
  }

  function closeMenu() {
    openMenu = undefined;
  }

  function toggleMenu(menu: 'locale') {
    openMenu = openMenu === menu ? undefined : menu;
  }

  onMount(() => {
    function closeOnPointer(event: PointerEvent) {
      if (!root) return;
      if (!root.contains(event.target as Node)) openMenu = undefined;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') openMenu = undefined;
    }

    document.addEventListener('pointerdown', closeOnPointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  });
</script>

{#if localeOptions.length > 1}
  <div bind:this={root} class="sd-scope-switcher" role="group" aria-label={t('scope.group')}>
    <div class:sd-open={openMenu === 'locale'} class="sd-scope-menu">
      <button type="button" class="sd-scope-trigger" aria-label={t('scope.locale')} aria-haspopup="menu" aria-expanded={openMenu === 'locale'} on:click={() => toggleMenu('locale')}>
        <span class="sd-scope-label-full">{activeLocaleLabel}</span>
        <span aria-hidden="true" class="sd-scope-label-short">{activeLocaleShortLabel}</span>
      </button>
      {#if openMenu === 'locale'}
        <div class="sd-scope-options" role="menu" aria-label={t('scope.localeOptions')}>
          {#each localeOptions as option}
            {#if option.path}
              <a href={option.path} role="menuitemradio" aria-checked={option.current} aria-current={option.current ? 'page' : undefined} on:click={closeMenu}>{option.label}</a>
            {:else}
              <span role="menuitemradio" aria-checked={option.current} aria-disabled="true">{option.label}</span>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
