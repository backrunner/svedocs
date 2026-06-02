import { error } from '@sveltejs/kit';
import config from 'virtual:svedocs/config';
import pageLoaders from 'virtual:svedocs/page-loaders';
import pages from 'virtual:svedocs/page-index';
import tree from 'virtual:svedocs/tree';
import { svedocsPagePrerender } from 'svedocs/cloudflare';
import type { SvedocsPage } from 'svedocs/core';
import type { PageLoad } from './$types';

export const prerender = svedocsPagePrerender();

export function entries() {
  return pages
    .filter((page) => page.routePath !== '/')
    .map((page) => ({ path: page.routePath.replace(/^\//, '') }));
}

export const load: PageLoad = async ({ params }) => {
  const routePath = `/${params.path ?? ''}`.replace(/\/$/, '') || '/';
  const pageIndex = pages.find((item) => item.routePath === routePath);
  if (!pageIndex) error(404, `No page found for ${routePath}`);
  const page = await loadFullPage(pageIndex);
  return { page, pages: mergeCurrentPage(pages, page), search: [], tree, config };
};

async function loadFullPage(page: SvedocsPage): Promise<SvedocsPage> {
  const loaded = await pageLoaders[page.id]?.();
  return loaded?.default ?? page;
}

function mergeCurrentPage(pages: SvedocsPage[], current: SvedocsPage): SvedocsPage[] {
  return pages.map((page) => page.id === current.id ? current : page);
}
