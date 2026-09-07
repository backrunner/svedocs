import { createSvedocsAgentHandle } from 'svedocs/agent';
import { createSvedocsHtmlCacheHandle } from 'svedocs/cloudflare';
import { building, dev } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import config from 'virtual:svedocs/config';
import markdown from 'virtual:svedocs/markdown';
import pages from 'virtual:svedocs/page-index';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = sequence(
  createSvedocsAgentHandle({ config, pages, markdown }),
  createSvedocsHtmlCacheHandle({
    config, pages, enabled: !dev && !building,
    include: (page) => page.kind === 'doc' && page.sourcePath.endsWith('.md')
      && (!page.frontmatter.layout || page.frontmatter.layout === 'docs')
  })
);
