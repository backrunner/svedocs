import { get, writable } from 'svelte/store';
import type { SvedocsThemeModeController } from '../types.js';

export function createThemeModeController(defaultMode: 'light' | 'dark' | 'system' = 'system'): SvedocsThemeModeController {
  const fixedMode = defaultMode === 'system' ? undefined : defaultMode;
  const mode = writable<'light' | 'dark'>(fixedMode ?? 'light');
  const preference = writable<'light' | 'dark' | 'system'>(defaultMode);
  let media: MediaQueryList | undefined;

  function resolveMode(nextPreference: 'light' | 'dark' | 'system'): 'light' | 'dark' {
    if (nextPreference !== 'system') return nextPreference;
    try {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  function applyResolvedMode(nextMode: 'light' | 'dark'): void {
    mode.set(nextMode);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = nextMode;
      document.documentElement.style.colorScheme = nextMode;
    }
  }

  function setPreference(nextPreference: 'light' | 'dark' | 'system'): void {
    if (fixedMode) {
      preference.set(fixedMode);
      return;
    }
    preference.set(nextPreference);
    writeStoredThemePreference(nextPreference);
    applyResolvedMode(resolveMode(nextPreference));
  }

  function apply(nextMode: 'light' | 'dark'): void {
    if (fixedMode) return;
    setPreference(nextMode);
  }

  function toggle(): void {
    if (fixedMode) return;
    apply(get(mode) === 'dark' ? 'light' : 'dark');
  }

  function syncFromSystem(): void {
    if (fixedMode) return;
    const stored = readStoredThemePreference();
    const nextPreference = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : defaultMode;
    preference.set(nextPreference);
    applyResolvedMode(resolveMode(nextPreference));
  }

  function syncFromMedia(): void {
    if (get(preference) === 'system') applyResolvedMode(resolveMode('system'));
  }

  function mount(): () => void {
    if (fixedMode) return () => undefined;
    const current = typeof document !== 'undefined' ? document.documentElement.dataset.theme : undefined;
    mode.set(current === 'dark' ? 'dark' : 'light');
    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        media = window.matchMedia('(prefers-color-scheme: dark)');
        media.addEventListener('change', syncFromMedia);
      }
    } catch {
      media = undefined;
    }
    syncFromSystem();
    return () => media?.removeEventListener('change', syncFromMedia);
  }

  return {
    mode,
    preference,
    apply,
    setPreference,
    toggle,
    mount
  };
}

function readStoredThemePreference(): string | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage.getItem('svedocs-theme') ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStoredThemePreference(value: 'light' | 'dark' | 'system'): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('svedocs-theme', value);
  } catch {
    // Theme switching remains functional when storage is blocked.
  }
}
