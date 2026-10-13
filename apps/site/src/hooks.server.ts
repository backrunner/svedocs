import { waitUntil } from 'cloudflare:workers';
import { createSvedocsHtmlHandle } from 'svedocs/routes';
import { createSvedocsAgentHandle } from 'svedocs/agent';
import { createSvedocsHtmlCacheHandle } from 'svedocs/cloudflare';
import { building, dev, version } from '$app/env';
import { sequence } from '@sveltejs/kit/hooks';
import config from 'virtual:svedocs/config';
import markdown from 'virtual:svedocs/markdown';
import pages from 'virtual:svedocs/page-index';
import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = sequence(
  createSvedocsHtmlHandle({ config, pages }),
  createSvedocsAgentHandle({ config, pages, markdown, waitUntil }),
  createSvedocsHtmlCacheHandle({
    config, pages, enabled: !dev && !building,
    include: (page) => (page.kind === 'doc' && page.sourcePath.endsWith('.md')
      && (!page.frontmatter.layout || page.frontmatter.layout === 'docs'))
      // Both home layouts render only build-time content; interactivity is client-side.
      || page.routePath === '/' || page.routePath === '/zh',
    maxAge: 3600,
    edgeCache: { version }, waitUntil
  })
);
