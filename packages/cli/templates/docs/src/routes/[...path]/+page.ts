import { error } from '@sveltejs/kit';
import pages from 'virtual:svedocs/pages';
import search from 'virtual:svedocs/search';
import tree from 'virtual:svedocs/tree';
import config from 'virtual:svedocs/config';
import type { PageLoad } from './$types';

const buildMode = typeof process !== 'undefined' ? process.env.SVEDOCS_BUILD_MODE : undefined;

export const prerender = buildMode === 'static';

export function entries() {
  return pages
    .filter((page) => page.routePath !== '/')
    .map((page) => ({ path: page.routePath.replace(/^\//, '') }));
}

export const load: PageLoad = ({ params }) => {
  const routePath = `/${params.path ?? ''}`.replace(/\/$/, '') || '/';
  const page = pages.find((item) => item.routePath === routePath);
  if (!page) error(404, `No page found for ${routePath}`);
  return { page, pages, search, tree, config };
};
