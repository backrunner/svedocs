import { createRobotsTxt } from 'svedocs/og';
import config from 'virtual:svedocs/config';

export const prerender = true;

export function GET() {
  return new Response(createRobotsTxt(config), {
    headers: {
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}
