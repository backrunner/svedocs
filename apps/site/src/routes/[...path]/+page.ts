import { loadSvedocsRoute } from '$lib/loadPage';
import pages from 'virtual:svedocs/pages';
import type { PageLoad } from './$types';

const buildMode = typeof process !== 'undefined' ? process.env.SVEDOCS_BUILD_MODE : undefined;

export const prerender = buildMode === 'static' ? true : buildMode === 'spa' ? false : 'auto';

export function entries() {
  return pages
    .filter((page) => page.routePath !== '/')
    .map((page) => ({ path: page.routePath.replace(/^\//, '') }));
}

export const load: PageLoad = ({ params }) => {
  return loadSvedocsRoute(params.path);
};
