import { loadSvedocsRoute } from '$lib/loadPage';
import type { PageLoad } from './$types';

const buildMode = typeof process !== 'undefined' ? process.env.SVEDOCS_BUILD_MODE : undefined;

export const prerender = buildMode === 'static' ? true : buildMode === 'spa' ? false : 'auto';

export const load: PageLoad = () => {
  return loadSvedocsRoute();
};
