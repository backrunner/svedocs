import { getContext, setContext } from 'svelte';

const initializer = Symbol('svedocs.theme.initializer');

/** The outer framework shell owns initialization, including custom layout fallbacks. */
export function claimThemeInitializer(): boolean {
  if (getContext<boolean>(initializer)) return false;
  setContext(initializer, true);
  return true;
}
