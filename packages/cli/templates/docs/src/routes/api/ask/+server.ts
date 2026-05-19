import { createConfiguredAskResponse, createMemoryRateLimiter } from 'svedocs/ai';
import { getRuntimeEnv } from '$lib/server/env';
import config from 'virtual:svedocs/config';
import records from 'virtual:svedocs/search';
import type { RequestHandler } from './$types';

export const prerender = false;

const rateLimiter = createMemoryRateLimiter({ windowMs: 60_000, max: 30 });

export const POST: RequestHandler = ({ request }) => {
  return createConfiguredAskResponse(config, records, request, {
    env: getRuntimeEnv(),
    rateLimiter
  });
};
