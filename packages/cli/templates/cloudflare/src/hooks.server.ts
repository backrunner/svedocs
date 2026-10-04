import { sequence } from '@sveltejs/kit/hooks';
import { createSvedocsHtmlHandle } from 'svedocs/routes';
import { createSvedocsAgentHandle } from 'svedocs/agent';
import config from 'virtual:svedocs/config';
import markdown from 'virtual:svedocs/markdown';
import pages from 'virtual:svedocs/page-index';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = sequence(
  createSvedocsHtmlHandle({ config, pages }),
  createSvedocsAgentHandle({ config, pages, markdown })
);
