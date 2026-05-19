import { extractMarkdownSections } from '../mdx/ast.js';
import type { SvedocsPage, SvedocsSearchRecord } from './types.js';

export function createSearchRecords(pages: readonly SvedocsPage[] = []): SvedocsSearchRecord[] {
  return pages.flatMap((page) => page.search.length > 0 ? page.search : [createPageSearchRecord(page)]);
}

export function createPageSearchRecords(page: SvedocsPage, markdown?: string): SvedocsSearchRecord[] {
  const pageRecord = createPageSearchRecord(page);
  if (!markdown) return [pageRecord];
  return [pageRecord, ...createSectionSearchRecords(page, markdown)];
}

export function createPageSearchRecord(page: SvedocsPage): SvedocsSearchRecord {
  return {
    id: `${page.id}:page`,
    pageId: page.id,
    url: page.routePath,
    title: page.title,
    content: page.plainText,
    metadata: {
      kind: page.kind,
      sourcePath: page.sourcePath,
      ...(page.locale ? { locale: page.locale } : {}),
      ...(page.version ? { version: page.version } : {}),
      ...(page.versionStatus ? { versionStatus: page.versionStatus } : {})
    }
  };
}

function createSectionSearchRecords(page: SvedocsPage, markdown: string): SvedocsSearchRecord[] {
  return extractMarkdownSections(markdown).map((section) => ({
    id: `${page.id}:${section.id}`,
    pageId: page.id,
    url: `${page.routePath}#${section.id}`,
    title: page.title,
    section: section.title,
    content: section.content,
    metadata: {
      kind: page.kind,
      sourcePath: page.sourcePath,
      ...(page.locale ? { locale: page.locale } : {}),
      ...(page.version ? { version: page.version } : {}),
      ...(page.versionStatus ? { versionStatus: page.versionStatus } : {}),
      headingId: section.id,
      headingDepth: section.depth
    }
  }));
}
