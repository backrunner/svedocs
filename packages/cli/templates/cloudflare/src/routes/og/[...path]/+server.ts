import { error } from '@sveltejs/kit';
import { createConfiguredOgImageFormat, createConfiguredOgImageRenderer, createPageOgImageEntries, createPageOgImagePath, createPageOgImageResponse } from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/pages';
import type { RequestHandler } from './$types';

const buildMode = typeof process !== 'undefined' ? process.env.SVEDOCS_BUILD_MODE : undefined;

export const prerender = buildMode === 'static';

const format = createConfiguredOgImageFormat(config);

export function entries() {
  return createPageOgImageEntries(pages, format);
}

export const GET: RequestHandler = async ({ params }) => {
  const requestPath = `/og/${params.path}`;
  const page = pages.find((candidate) => createPageOgImagePath(candidate, format) === requestPath);
  if (!page) error(404, `No OG image found for ${requestPath}`);
  return createPageOgImageResponse(config, page, {
    format,
    renderer: createConfiguredOgImageRenderer(config),
    ...(config.seo.ogImage !== false && typeof config.seo.ogImage.template === 'function'
      ? { template: config.seo.ogImage.template }
      : {})
  });
};
