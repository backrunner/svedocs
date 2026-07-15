import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('theme styles', () => {
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
    expect(styles).toContain(':root[data-theme="dark"] .sd-theme-toggle [data-theme-icon="dark"]');
  });
});
