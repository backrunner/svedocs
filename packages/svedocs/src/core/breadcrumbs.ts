import type { SvedocsPage } from './types.js';

export function findDocsRoot(page: SvedocsPage, pages: readonly SvedocsPage[] = []): string {
  const root = pages.find((candidate) => candidate.kind === 'doc' && candidate.scopePath === '/docs' && candidate.locale === page.locale);
  if (root) return root.routePath;
  const suffix = page.scopePath === '/docs' ? '' : page.scopePath.slice('/docs'.length);
  return suffix && page.routePath.endsWith(suffix) ? page.routePath.slice(0, -suffix.length) || '/docs'
    : page.scopePath === '/docs' ? page.routePath : '/docs';
}

/** Only link real ancestors, in the current locale. Shared by the UI and JSON-LD. */
export function pageBreadcrumbs(page: SvedocsPage, pages: readonly SvedocsPage[], docsLabel: string): Array<{ label: string; path: string }> {
  if (page.kind !== 'doc') return [];
  const root = findDocsRoot(page, pages);
  return pages.filter((candidate) => candidate.kind === 'doc' && candidate.locale === page.locale
    && candidate.routePath !== page.routePath && !candidate.hidden
    && (candidate.routePath === root || candidate.routePath.startsWith(`${root}/`))
    && page.routePath.startsWith(`${candidate.routePath}/`))
    .sort((a, b) => a.routePath.length - b.routePath.length)
    .map((candidate) => ({ path: candidate.routePath, label: candidate.routePath === root ? docsLabel : candidate.navTitle ?? candidate.title }));
}
