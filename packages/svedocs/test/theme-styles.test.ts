import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('theme styles', () => {
  it.each(['styles.css', 'base.css'])('smoothly scrolls to anchors in %s', async (file) => {
    const styles = await readFile(new URL(`../src/theme/${file}`, import.meta.url), 'utf8');

    expect(styles).toMatch(/html\s*\{[^}]*scroll-behavior:\s*smooth;/s);
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?scroll-behavior:\s*auto !important;/
    );
  });

  it('scopes root sidebar chevron alignment to direct menu items', async () => {
    const styles = await readFile(new URL('../src/theme/styles.css', import.meta.url), 'utf8');

    expect(styles).toContain(
      '.sd-sidebar-list[data-depth="0"] > .sd-sidebar-item > .sd-sidebar-group > .sd-sidebar-summary > .sd-sidebar-chevron {'
    );
    expect(styles).not.toMatch(/\.sd-sidebar-list\[data-depth="0"\]\s+\.sd-sidebar-chevron\s*\{/);
  });

  it('selects the theme toggle icon before hydration', async () => {
    const styles = await readFile(new URL('../src/theme/styles.css', import.meta.url), 'utf8');

    expect(styles).toContain('[data-theme-icon="light"]');
    expect(styles).toContain(':is(:root[data-theme="dark"], html:has(.sd-root[data-theme="dark"])) .sd-theme-toggle [data-theme-icon="dark"]');
  });

  it('supports fixed dark tokens on the rendered theme root', async () => {
    const styles = await readFile(new URL('../src/theme/styles.css', import.meta.url), 'utf8');

    expect(styles).toContain('.sd-root[data-theme="dark"] {');
    expect(styles).toContain('html:has(.sd-root[data-theme="dark"])');
  });

  it('forces Shiki token colors over global text styles', async () => {
    const styles = await readFile(new URL('../src/theme/styles.css', import.meta.url), 'utf8');

    expect(styles).toContain('.sd-code.shiki [style*="--shiki-light:"]');
    expect(styles).toContain('color: var(--shiki-light) !important;');
    expect(styles).toContain('.sd-code.shiki [style*="--shiki-dark:"]');
    expect(styles).toContain('color: var(--shiki-dark) !important;');
  });

  it('centers the search dialog in the viewport', async () => {
    const styles = await readFile(new URL('../src/theme/styles.css', import.meta.url), 'utf8');

    expect(styles).toMatch(/\.sd-search-dialog\s*\{[^}]*top:\s*50%;[^}]*transform:\s*translate\(-50%,\s*-50%\);/s);
    expect(styles).toContain('transform: translate(-50%, calc(-50% - 8px)) scale(.985);');
    expect(styles).toContain('transform: translate(-50%, -50%) scale(1);');
  });
});
