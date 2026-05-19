import { error } from '@sveltejs/kit';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/pages';
import search from 'virtual:svedocs/search';
import tree from 'virtual:svedocs/tree';

export function loadSvedocsRoute(path = '') {
  const routePath = normalizeRoutePath(path);
  const page = pages.find((item) => item.routePath === routePath);
  if (!page) error(404, `No svedocs page found for ${routePath}`);
  return {
    page,
    pages,
    search,
    tree,
    config
  };
}

function normalizeRoutePath(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean ? `/${clean}` : '/';
}
