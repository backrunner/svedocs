import { error } from '@sveltejs/kit';
import config from 'virtual:svedocs/config';
import pageLoaders from 'virtual:svedocs/page-loaders';
import pages from 'virtual:svedocs/page-index';
import tree from 'virtual:svedocs/tree';
import type { SvedocsPage } from 'svedocs/core';

export async function loadSvedocsRoute(path = '') {
  const routePath = normalizeRoutePath(path);
  const pageIndex = pages.find((item) => item.routePath === routePath);
  if (!pageIndex) error(404, `No svedocs page found for ${routePath}`);
  const page = await loadFullPage(pageIndex);
  return {
    page,
    pages: mergeCurrentPage(pages, page),
    search: [],
    tree,
    config
  };
}

async function loadFullPage(page: SvedocsPage): Promise<SvedocsPage> {
  const loaded = await pageLoaders[page.id]?.();
  return loaded?.default ?? page;
}

function mergeCurrentPage(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
  return pages.map((page) => page.id === current.id ? current : page);
}

function normalizeRoutePath(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean ? `/${clean}` : '/';
}
