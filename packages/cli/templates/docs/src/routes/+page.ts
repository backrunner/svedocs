import pageLoaders from 'virtual:svedocs/page-loaders';
import pages from 'virtual:svedocs/page-index';
import tree from 'virtual:svedocs/tree';
import config from 'virtual:svedocs/config';
import { svedocsPagePrerender } from 'svedocs/cloudflare';
import type { SvedocsPage } from 'svedocs/core';
import type { PageLoad } from './$types';

export const prerender = svedocsPagePrerender();

export const load: PageLoad = async () => {
  const pageIndex = pages.find((page) => page.routePath === '/');
  const page = pageIndex ? await loadFullPage(pageIndex) : undefined;
  return { page, pages: page ? mergeCurrentPage(pages, page) : pages, search: [], tree, config };
};

async function loadFullPage(page: SvedocsPage): Promise<SvedocsPage> {
  const loaded = await pageLoaders[page.id]?.();
  return loaded?.default ?? page;
}

function mergeCurrentPage(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
  return pages.map((page) => page.id === current.id ? current : page);
}
