import { createSitemapXml } from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/pages';

const buildMode = typeof process !== 'undefined' ? process.env.SVEDOCS_BUILD_MODE : undefined;

export const prerender = buildMode === 'static';

export function GET() {
  return new Response(createSitemapXml(config, pages), {
    headers: {
      'content-type': 'application/xml; charset=utf-8'
    }
  });
}
