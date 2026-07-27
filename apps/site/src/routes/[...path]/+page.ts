import { loadSvedocsRoute } from '$lib/loadPage';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import { svedocsPagePrerender } from 'svedocs/cloudflare';
import { createSvedocsRouteEntries } from 'svedocs/routes';
import type { PageLoad } from './$types';

export const prerender = svedocsPagePrerender(undefined, config);

export function entries() {
  return createSvedocsRouteEntries(pages, config)
    .map((path) => ({ path: path.replace(/^\//, '') }));
}

export const load: PageLoad = ({ params }) => {
  return loadSvedocsRoute(params.path);
};
