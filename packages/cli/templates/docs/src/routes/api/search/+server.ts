import { createConfiguredSearchResponse } from 'svedocs/search';
import { getRuntimeEnv } from '$lib/server/env';
import config from 'virtual:svedocs/config';
import records from 'virtual:svedocs/search';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = ({ platform, request }) => {
  return createConfiguredSearchResponse(config, records, request, {
    env: getRuntimeEnv(platform?.env, {
      ignoreDevBindings: [config.cloudflare.aiSearch.binding, 'SVEDOCS_AI_SEARCH']
    })
  });
};
