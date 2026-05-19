import { createConfiguredSearchResponse } from 'svedocs/search';
import { getRuntimeEnv } from '$lib/server/env';
import config from 'virtual:svedocs/config';
import records from 'virtual:svedocs/search';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = ({ request }) => {
  return createConfiguredSearchResponse(config, records, request, {
    env: getRuntimeEnv()
  });
};
