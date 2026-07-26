import { createConfiguredAskResponse, createMemoryRateLimiter, resolveCloudflareRateLimiter } from 'svedocs/ai';
import { getRuntimeEnv } from '$lib/server/env';
import config from 'virtual:svedocs/config';
import records from 'virtual:svedocs/search';
import type { RequestHandler } from './$types';

export const prerender = false;
const rateLimiter = createMemoryRateLimiter({ windowMs: 60_000, max: 30 });

export const POST: RequestHandler = ({ platform, request }) => {
  const env = getRuntimeEnv(platform?.env, {
    ignoreDevBindings: [config.cloudflare.aiSearch.binding, 'SVEDOCS_AI_SEARCH']
  });
  return createConfiguredAskResponse(config, records, request, {
    env,
    rateLimiter: resolveCloudflareRateLimiter(env, rateLimiter)
  });
};
