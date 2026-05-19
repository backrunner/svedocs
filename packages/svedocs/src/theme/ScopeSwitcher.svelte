<script lang="ts">
  import type { SvedocsLocale, SvedocsPage, SvedocsVersion } from '../core/types.js';

  export let page: SvedocsPage | undefined = undefined;
  export let pages: SvedocsPage[] = [];
  export let locales: SvedocsLocale[] = [];
  export let versions: SvedocsVersion[] = [];

  $: localeOptions = createScopeOptions(
    locales,
    page?.locale,
    (locale) => locale.code,
    (locale) => locale.label,
    (locale) => findScopedPage({ locale: locale.code, version: page?.version })?.routePath
  );
  $: versionOptions = page?.kind === 'doc'
    ? createScopeOptions(
        versions,
        page?.version,
        (version) => version.name,
        (version) => formatVersionLabel(version),
        (version) => findScopedPage({ locale: page?.locale, version: version.name })?.routePath
      )
    : [];

  function findScopedPage(scope: { locale?: string; version?: string }): SvedocsPage | undefined {
    if (!page) return undefined;
    return pages.find((candidate) => (
      candidate.scopePath === page.scopePath
      && (scope.locale ? candidate.locale === scope.locale : candidate.locale === page.locale)
      && (scope.version ? candidate.version === scope.version : candidate.version === page.version)
    ));
  }

  function formatVersionLabel(version: SvedocsVersion): string {
    if (version.status === 'deprecated') return `${version.label} (deprecated)`;
    if (version.status === 'archived') return `${version.label} (archived)`;
    if (version.status === 'next') return `${version.label} (next)`;
    return version.label;
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

  function navigate(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    if (select.value) window.location.href = select.value;
  }
</script>

{#if localeOptions.length > 1 || versionOptions.length > 1}
  <div class="sd-scope-switcher" aria-label="Documentation scope">
    {#if localeOptions.length > 1}
      <label>
        <span class="sd-visually-hidden">Locale</span>
        <select aria-label="Locale" on:change={navigate}>
          {#each localeOptions as option}
            <option value={option.path ?? ''} selected={option.current} disabled={!option.path}>
              {option.label}
            </option>
          {/each}
        </select>
      </label>
    {/if}
    {#if versionOptions.length > 1}
      <label>
        <span class="sd-visually-hidden">Version</span>
        <select aria-label="Version" on:change={navigate}>
          {#each versionOptions as option}
            <option value={option.path ?? ''} selected={option.current} disabled={!option.path}>
              {option.label}
            </option>
          {/each}
        </select>
      </label>
    {/if}
  </div>
{/if}
