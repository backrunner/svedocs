import type { Component, ComponentType, SvelteComponent, Snippet } from 'svelte';
import type { SvedocsPage } from '../core/types.js';
import type { SvedocsContentComponent, SvedocsThemeContext } from './types.js';

interface ThemeSlots {
  default: Record<string, unknown>;
  background: Record<string, never>;
  'doc-header': { page: SvedocsPage; breadcrumbs: Array<{ label: string; path: string }> };
  landing: SvedocsThemeContext & { content: SvedocsContentComponent; context: SvedocsThemeContext };
  'home-hero-visual': SvedocsThemeContext & { context: SvedocsThemeContext };
  'home-features': SvedocsThemeContext & { context: SvedocsThemeContext; cards: Array<{ label: string; title: string; description: string; href: string; glyph: string }> };
}

/** Describe the legacy slot bridge while preserving replacement component props. */
export function withThemeSlots<Props extends object>(
  component: Component<Props>
): ComponentType<SvelteComponent<Props & { children?: Snippet }, Record<string, CustomEvent<unknown>>, ThemeSlots>> {
  return component as unknown as ComponentType<SvelteComponent<Props & { children?: Snippet }, Record<string, CustomEvent<unknown>>, ThemeSlots>>;
}
