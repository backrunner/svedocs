import pages from 'virtual:svedocs/pages';
import search from 'virtual:svedocs/search';
import tree from 'virtual:svedocs/tree';
import config from 'virtual:svedocs/config';
import type { PageLoad } from './$types';

const buildMode = typeof process !== 'undefined' ? process.env.SVEDOCS_BUILD_MODE : undefined;

export const prerender = buildMode === 'static';

export const load: PageLoad = () => {
  return { page: pages.find((page) => page.routePath === '/'), pages, search, tree, config };
};
