import { getContext, setContext } from 'svelte';
import type { Readable } from 'svelte/store';
import type { SvedocsThemeContext } from './types.js';

const themeContextKey = Symbol.for('svedocs.theme.context');

/** Call during component initialization. Use a store so client navigation stays reactive. */
export function provideSvedocsTheme(context: Readable<SvedocsThemeContext>): void {
  setContext(themeContextKey, context);
}

/** Read the nearest DocsApp or RootLayout context from a custom component. */
export function useSvedocsTheme(): Readable<SvedocsThemeContext> {
  const context = getContext<Readable<SvedocsThemeContext> | undefined>(themeContextKey);
  if (!context) throw new Error('useSvedocsTheme must be called inside DocsApp, RootLayout, or a provideSvedocsTheme provider.');
  return context;
}
