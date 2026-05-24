import type { SvedocsPage, SvedocsTreeItem } from './types.js';
import { createGroupId, titleFromSegment } from './utils.js';

interface MutableTreeItem {
  id: string;
  title: string;
  path?: string;
  children: MutableTreeItem[];
  collapsed?: boolean;
  order?: number;
  section?: boolean;
  icon?: string;
  _weight: number;
}

export function createPageTree(pages: readonly SvedocsPage[] = []): SvedocsTreeItem[] {
  const docs = [...pages].filter((page) => page.kind === 'doc' && !page.hidden);
  const pageByPath = new Map(docs.map((page) => [page.routePath, page]));
  const nodeByPath = new Map<string, MutableTreeItem>();
  const root: MutableTreeItem[] = [];

  for (const page of docs.sort(comparePagesForNavigation)) {
    const segments = getDocRouteSegments(page);
    let children = root;
    const accumulated: string[] = [];

    for (const [index, segment] of segments.entries()) {
      const isDocsIndex = segments.length === 1 && segment === 'index';
      const isLeaf = index === segments.length - 1;
      if (!isDocsIndex) accumulated.push(segment);
      const nodePath = isDocsIndex ? '/docs' : `/docs/${accumulated.join('/')}`;
      const sourcePage = pageByPath.get(nodePath);
      const node = upsertTreeNode({
        children,
        nodeByPath,
        nodePath,
        segment,
        page: sourcePage,
        leafPage: isLeaf ? page : undefined
      });
      children = node.children;
    }
  }

  return finalizeTree(root);
}

export function flattenPageTree(tree: readonly SvedocsTreeItem[] = []): SvedocsTreeItem[] {
  return tree.flatMap((item) => [item, ...flattenPageTree(item.children ?? [])]);
}

export function wirePrevNext(pages: SvedocsPage[], tree: SvedocsTreeItem[]) {
  const pageByPath = new Map(pages.map((page) => [page.routePath, page]));
  const docs = flattenPageTree(tree)
    .map((item) => item.path ? pageByPath.get(item.path) : undefined)
    .filter((page): page is SvedocsPage => Boolean(page && page.kind === 'doc' && !page.hidden));
  for (const page of pages) {
    delete page.prev;
    delete page.next;
  }
  const docsByScope = groupDocsByScope(docs);
  for (const scopedDocs of docsByScope.values()) {
    for (const [index, page] of scopedDocs.entries()) {
      const prev = scopedDocs[index - 1];
      const next = scopedDocs[index + 1];
      if (prev) page.prev = { title: prev.navTitle ?? prev.title, path: prev.routePath };
      if (next) page.next = { title: next.navTitle ?? next.title, path: next.routePath };
    }
  }
}

function getDocRouteSegments(page: SvedocsPage): string[] {
  if (page.routePath === '/docs') return ['index'];
  return page.routePath.replace(/^\/docs\/?/, '').split('/').filter(Boolean);
}

function upsertTreeNode(input: {
  children: MutableTreeItem[];
  nodeByPath: Map<string, MutableTreeItem>;
  nodePath: string;
  segment: string;
  page: SvedocsPage | undefined;
  leafPage: SvedocsPage | undefined;
}): MutableTreeItem {
  const page = input.page ?? input.leafPage;
  const existing = input.nodeByPath.get(input.nodePath);
  if (existing) {
    if (page) applyPageToTreeItem(existing, page);
    return existing;
  }
  const item: MutableTreeItem = {
    id: page?.id ?? createGroupId(input.nodePath),
    title: page?.navTitle ?? page?.title ?? titleFromSegment(input.segment),
    children: [],
    _weight: page?.order ?? Number.POSITIVE_INFINITY,
    ...(page ? { path: page.routePath } : {}),
    ...(typeof page?.order === 'number' ? { order: page.order } : {}),
    ...(typeof page?.collapsed === 'boolean' ? { collapsed: page.collapsed } : {}),
    ...(page?.section === true ? { section: true } : {}),
    ...(page?.icon ? { icon: page.icon } : {})
  };
  input.nodeByPath.set(input.nodePath, item);
  input.children.push(item);
  return item;
}

function applyPageToTreeItem(item: MutableTreeItem, page: SvedocsPage) {
  item.id = page.id;
  item.title = page.navTitle ?? page.title;
  item.path = page.routePath;
  item._weight = page.order ?? item._weight;
  if (typeof page.order === 'number') item.order = page.order;
  if (typeof page.collapsed === 'boolean') item.collapsed = page.collapsed;
  if (page.section === true) item.section = true;
  if (page.icon) item.icon = page.icon;
}

function finalizeTree(items: MutableTreeItem[]): SvedocsTreeItem[] {
  for (const item of items) {
    item._weight = Math.min(item._weight, ...item.children.map((child) => computeTreeWeight(child)));
  }
  return items
    .sort(compareTreeItems)
    .map((item) => {
      const children = finalizeTree(item.children);
      return {
        id: item.id,
        title: item.title,
        ...(item.path ? { path: item.path } : {}),
        ...(children.length > 0 ? { children } : {}),
        ...(typeof item.collapsed === 'boolean' ? { collapsed: item.collapsed } : {}),
        ...(typeof item.order === 'number' ? { order: item.order } : {}),
        ...(item.section === true ? { section: true } : {}),
        ...(item.icon ? { icon: item.icon } : {})
      };
    });
}

function computeTreeWeight(item: MutableTreeItem): number {
  item._weight = Math.min(item._weight, ...item.children.map((child) => computeTreeWeight(child)));
  return item._weight;
}

function compareTreeItems(a: MutableTreeItem, b: MutableTreeItem): number {
  const byWeight = a._weight - b._weight;
  if (Number.isFinite(byWeight) && byWeight !== 0) return byWeight;
  if (a.path && b.path) return a.path.localeCompare(b.path);
  return a.title.localeCompare(b.title);
}

function comparePagesForNavigation(a: SvedocsPage, b: SvedocsPage): number {
  const orderA = a.order ?? Number.POSITIVE_INFINITY;
  const orderB = b.order ?? Number.POSITIVE_INFINITY;
  const byOrder = orderA - orderB;
  return byOrder === 0 ? a.routePath.localeCompare(b.routePath) : byOrder;
}

function groupDocsByScope(docs: SvedocsPage[]): Map<string, SvedocsPage[]> {
  const groups = new Map<string, SvedocsPage[]>();
  for (const page of docs) {
    const key = page.locale ?? '';
    const group = groups.get(key) ?? [];
    group.push(page);
    groups.set(key, group);
  }
  return groups;
}
