import { error } from '@sveltejs/kit';
import { createConfiguredOgImageFormat, createConfiguredOgImageRenderer, createConfiguredOgImageTemplate, createConfiguredPageOgImageEntries, createPageOgImagePath, createPageOgImageResponse, isOgImageEnabled } from 'svedocs/og';
import config from 'virtual:svedocs/server-config';
import pages from 'virtual:svedocs/pages';
import type { RequestHandler } from './$types';

// Static OG files may already satisfy every entry after CLI generation.
export const prerender = isOgImageEnabled(config) ? 'auto' : false;

const format = createConfiguredOgImageFormat(config);
const template = createConfiguredOgImageTemplate(config);

export function entries() {
  return createConfiguredPageOgImageEntries(config, pages);
}

export const GET: RequestHandler = async ({ params }) => {
  if (!isOgImageEnabled(config)) error(404, 'OG images are disabled.');
  const requestPath = `/og/${params.path}`;
  const page = pages.find((candidate) => createPageOgImagePath(candidate, format) === requestPath);
  if (!page) error(404, `No OG image found for ${requestPath}`);
  return createPageOgImageResponse(config, page, {
    format,
    renderer: createConfiguredOgImageRenderer(config),
    ...(template ? { template } : {})
  });
};
