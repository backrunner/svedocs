import { derived, writable } from 'svelte/store';
import type { SvedocsResolvedConfig } from '../../core/types.js';
import type { SvedocsMobileNavController, SvedocsPageToolsController } from '../types.js';
const copyIconSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h9v14H9zM6 8v12h10"/></svg>';
const checkIconSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"/></svg>';

export function createMobileNavController(): SvedocsMobileNavController {
  const open = writable(false);

  function toggle(): void {
    open.update((value) => !value);
  }

  function close(): void {
    open.set(false);
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close();
  }

  return {
    open,
    toggle,
    close,
    handleWindowKeydown
  };
}

export function createPageToolsController(config: SvedocsResolvedConfig): SvedocsPageToolsController {
  const scrolled = writable(false);
  const aiEnabled = config.ai.enabled;
  const visible = derived(scrolled, ($scrolled) => aiEnabled || $scrolled);
  const mode = derived(scrolled, (): 'pill' | 'solo' => (aiEnabled ? 'pill' : 'solo'));
  const aiCollapsed = derived(scrolled, ($scrolled) => aiEnabled && $scrolled);

  function openAskAi(): void {
    if (!aiEnabled || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('svedocs:open-ai'));
  }

  function backToTop(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function mount(): () => void {
    if (typeof window === 'undefined') return () => undefined;
    function updateScrolled() {
      scrolled.set(window.scrollY > 240);
    }
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }

  return {
    scrolled,
    visible,
    mode,
    aiCollapsed,
    openAskAi,
    backToTop,
    mount
  };
}

export async function copyTextToClipboard(source: string): Promise<void> {
  await navigator.clipboard.writeText(source.trim());
}

export async function copyCodeToClipboard(button: HTMLButtonElement, source: string, copiedLabel = 'Copied', idleLabel = 'Copy code'): Promise<void> {
  try {
    await copyTextToClipboard(source);
    button.dataset.state = 'copied';
    button.innerHTML = checkIconSvg;
    button.setAttribute('aria-label', copiedLabel);
    window.setTimeout(() => {
      button.dataset.state = 'idle';
      button.innerHTML = copyIconSvg;
      button.setAttribute('aria-label', idleLabel);
    }, 1600);
  } catch {
    button.dataset.state = 'error';
  }
}
