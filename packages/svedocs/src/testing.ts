import type { SvedocsPage } from './core.js';

export function createFixturePage(overrides: Partial<SvedocsPage> = {}): SvedocsPage {
  const id = overrides.id ?? 'index';
  const routePath = overrides.routePath ?? '/';
  return {
    id,
    sourcePath: overrides.sourcePath ?? 'content/index.md',
    routePath,
    scopePath: overrides.scopePath ?? routePath,
    slug: overrides.slug ?? [],
    kind: overrides.kind ?? 'doc',
    title: overrides.title ?? 'Introduction',
    html: overrides.html ?? '<h1>Introduction</h1>',
    plainText: overrides.plainText ?? 'Introduction',
    headings: overrides.headings ?? [],
    links: overrides.links ?? [],
    codeBlocks: overrides.codeBlocks ?? [],
    frontmatter: overrides.frontmatter ?? {},
    seo: overrides.seo ?? { title: overrides.title ?? 'Introduction' },
    search: overrides.search ?? [],
    lastUpdated: overrides.lastUpdated ?? '2026-05-18T00:00:00.000Z',
    ...overrides
  };
}
