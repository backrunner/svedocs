import type { AiRateLimiter, AiRateLimitStore, CloudflareKvNamespace } from './types.js';

export function createMemoryRateLimiter(input: {
  windowMs: number;
  max: number;
}): AiRateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return createStoreRateLimiter({
    windowMs: input.windowMs,
    max: input.max,
    store: {
      async get(key) {
        return buckets.get(key);
      },
      async put(key, value) {
        buckets.set(key, value);
      }
    }
  });
}

export function createStoreRateLimiter(input: {
  windowMs: number;
  max: number;
  store: AiRateLimitStore;
  prefix?: string;
}): AiRateLimiter {
  return {
    async check({ key }) {
      const now = Date.now();
      const storeKey = `${input.prefix ?? 'svedocs:ai'}:${key}`;
      const existing = await input.store.get(storeKey);
      if (!existing || existing.resetAt <= now) {
        await input.store.put(storeKey, { count: 1, resetAt: now + input.windowMs }, Math.ceil(input.windowMs / 1000));
        return { allowed: true };
      }
      const next = { count: existing.count + 1, resetAt: existing.resetAt };
      await input.store.put(storeKey, next, Math.ceil((existing.resetAt - now) / 1000));
      if (next.count > input.max) {
        return {
          allowed: false,
          retryAfter: Math.ceil((existing.resetAt - now) / 1000)
        };
      }
      return { allowed: true };
    }
  };
}

export function createCloudflareKvRateLimiter(input: {
  namespace: CloudflareKvNamespace;
  windowMs: number;
  max: number;
  prefix?: string;
}): AiRateLimiter {
  return createStoreRateLimiter({
    windowMs: input.windowMs,
    max: input.max,
    ...(input.prefix ? { prefix: input.prefix } : {}),
    store: {
      async get(key) {
        return input.namespace.get<{ count: number; resetAt: number }>(key, { type: 'json' }).then((value) => value ?? undefined);
      },
      async put(key, value, ttlSeconds) {
        await input.namespace.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
      }
    }
  });
}
