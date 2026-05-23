import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/pages';
import search from 'virtual:svedocs/search';
import tree from 'virtual:svedocs/tree';
import { svedocsPagePrerender } from 'svedocs/cloudflare';
import type { PageLoad } from './$types';

export const prerender = svedocsPagePrerender();

export const load: PageLoad = () => {
  return { page: pages.find((page) => page.routePath === '/'), pages, search, tree, config };
};
