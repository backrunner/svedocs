import { createRobotsTxt } from 'svedocs/og';
import config from 'virtual:svedocs/config';

const buildMode = typeof process !== 'undefined' ? process.env.SVEDOCS_BUILD_MODE : undefined;

export const prerender = buildMode === 'static';

export function GET() {
  return new Response(createRobotsTxt(config), {
    headers: {
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}
