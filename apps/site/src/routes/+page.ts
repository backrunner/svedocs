import { loadSvedocsRoute } from '$lib/loadPage';
import { svedocsPagePrerender } from 'svedocs/cloudflare';
import type { PageLoad } from './$types';

export const prerender = svedocsPagePrerender();

export const load: PageLoad = () => {
  return loadSvedocsRoute();
};
