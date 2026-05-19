<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { SvedocsPage, SvedocsResolvedConfig, SvedocsSearchRecord } from '../core/types.js';
  import { searchRecords } from '../search/local.js';
  import type { SearchScope } from '../search/types.js';

  export let config: SvedocsResolvedConfig;
  export let page: SvedocsPage | undefined = undefined;
  export let pages: SvedocsPage[] = [];
  export let records: SvedocsSearchRecord[] = [];
  export let scope: SearchScope = {};

  let open = false;
  let query = '';
  let activeIndex = 0;
  let trigger: HTMLButtonElement | undefined;
  let input: HTMLInputElement | undefined;
  let dialog: HTMLDivElement | undefined;
  let previousFocus: HTMLElement | undefined;

  $: commands = createCommands(config, page, pages, records, query, scope);
  $: activeIndex = Math.min(activeIndex, Math.max(commands.length - 1, 0));

  function show() {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    open = true;
    tick().then(() => input?.focus());
  }

  function hide() {
    open = false;
    query = '';
    activeIndex = 0;
    tick().then(() => (previousFocus ?? trigger)?.focus());
  }

  function run(command = commands[activeIndex]) {
    if (!command) return;
    command.run();
    hide();
  }

  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      show();
    }
    if (event.key === 'Escape' && open) hide();
  }

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      trapFocus(event, dialog);
    }
    if (event.key === 'Escape') {
      hide();
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, commands.length - 1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  interface CommandItem {
    id: string;
    title: string;
    detail: string;
    group: string;
    run: () => void;
  }

  function createCommands(
    config: SvedocsResolvedConfig,
    page: SvedocsPage | undefined,
    pages: SvedocsPage[],
    records: SvedocsSearchRecord[],
    query: string,
    scope: SearchScope
  ): CommandItem[] {
    const base: CommandItem[] = [
      {
        id: 'home',
        title: 'Go home',
        detail: config.site.name,
        group: 'Navigation',
        run: () => (window.location.href = '/')
      },
      {
        id: 'docs',
        title: 'Open docs',
        detail: '/docs',
        group: 'Navigation',
        run: () => (window.location.href = '/docs')
      },
      {
        id: 'search',
        title: 'Open search',
        detail: 'Press Command K',
        group: 'Actions',
        run: () => window.dispatchEvent(new CustomEvent('svedocs:open-search'))
      },
      {
        id: 'ask',
        title: 'Ask AI',
        detail: config.ai.enabled ? config.ai.provider : 'Disabled',
        group: 'Actions',
        run: () => window.dispatchEvent(new CustomEvent('svedocs:open-ai'))
      },
      ...(page?.editUrl ? [{
        id: 'edit',
        title: 'Edit this page',
        detail: page.sourcePath,
        group: 'Actions',
        run: () => window.location.assign(page.editUrl as string)
      }] satisfies CommandItem[] : [])
    ];
    const pageCommands = pages
      .filter((candidate) => !candidate.hidden)
      .filter((candidate) => matchesPageScope(candidate, scope))
      .map((candidate) => ({
        id: `page:${candidate.id}`,
        title: candidate.title,
        detail: candidate.routePath,
        group: candidate.kind === 'doc' ? 'Docs' : 'Pages',
        run: () => (window.location.href = candidate.routePath)
      }));
    const searchCommands = searchRecords(records, { query, limit: 8, ...scope }).map((result) => ({
      id: `search:${result.id}`,
      title: result.section ?? result.title,
      detail: result.section ? `${result.title} · ${result.url}` : result.url,
      group: 'Search',
      run: () => (window.location.href = result.url)
    }));
    const all = query.trim() ? [...pageCommands, ...searchCommands, ...base] : [...base, ...pageCommands];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return all.slice(0, 12);
    return all
      .map((command) => {
        const haystack = `${command.title} ${command.detail} ${command.group}`.toLowerCase();
        const score = normalized.split(/\s+/).reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return { command, score };
      })
      .filter((item) => item.score > 0 || item.command.group === 'Search')
      .sort((a, b) => b.score - a.score)
      .map((item) => item.command)
      .slice(0, 12);
  }

  function matchesPageScope(page: SvedocsPage, scope: SearchScope): boolean {
    return (!scope.locale || page.locale === scope.locale)
      && (!scope.version || page.version === scope.version)
      && (!scope.kind || page.kind === scope.kind);
  }

  function trapFocus(event: KeyboardEvent, root: HTMLElement | undefined) {
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<button bind:this={trigger} class="sd-command-trigger" type="button" aria-label="Open command palette" aria-haspopup="dialog" aria-expanded={open} on:click={show}>
  <span>⌘⇧P</span>
</button>

{#if open}
  <div class="sd-dialog-backdrop" role="presentation" on:click={hide}></div>
  <div
    bind:this={dialog}
    class="sd-command-dialog"
    role="dialog"
    aria-modal="true"
    aria-label="Command palette"
    tabindex="-1"
    on:keydown={handleDialogKeydown}
  >
    <label class="sd-search-box">
      <span class="sd-visually-hidden">Command query</span>
      <input bind:this={input} bind:value={query} placeholder="Run command or jump to docs" />
    </label>
    <div class="sd-command-list" role="listbox" aria-label="Commands">
      {#if commands.length > 0}
        {#each commands as command, index}
          <button
            class:sd-active={index === activeIndex}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            on:mouseenter={() => (activeIndex = index)}
            on:click={() => run(command)}
          >
            <span>{command.title}</span>
            <small>{command.group} · {command.detail}</small>
          </button>
        {/each}
      {:else}
        <p class="sd-empty-state">No command found.</p>
      {/if}
    </div>
  </div>
{/if}
