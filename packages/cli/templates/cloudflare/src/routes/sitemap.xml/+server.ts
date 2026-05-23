import { createSitemapXml } from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/pages';

export const prerender = true;

export function GET() {
  return new Response(createSitemapXml(config, pages), {
    headers: {
      'content-type': 'application/xml; charset=utf-8'
    }
  });
}
