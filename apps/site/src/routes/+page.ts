import config from 'virtual:svedocs/config';
import { loadSvedocsRoute } from '$lib/loadPage';
import { svedocsPagePrerender } from 'svedocs/cloudflare';
import type { PageLoad } from './$types';

export const prerender = svedocsPagePrerender(undefined, config);

export const load: PageLoad = () => {
  return loadSvedocsRoute();
};
