import { createRssResponse } from 'svedocs/og';
import config from 'virtual:svedocs/config';
import pages from 'virtual:svedocs/page-index';
import type { RequestHandler } from './$types';

export const prerender = Boolean(config.seo.rss);

export const GET: RequestHandler = ({ request }) => createRssResponse(config, pages, request);
