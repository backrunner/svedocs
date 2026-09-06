import type { AiRateLimiter, AiRateLimitStore, CloudflareKvNamespace, CloudflareRateLimitBinding } from './types.js';

export function createMemoryRateLimiter(input: {
  windowMs: number;
  max: number;
}): AiRateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    check({ key }) {
      const now = Date.now();
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + input.windowMs });
        if (buckets.size > 10_000) {
          for (const [storedKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(storedKey);
        }
        return { allowed: true };
      }
      existing.count += 1;
      return existing.count > input.max
        ? { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
        : { allowed: true };
    }
  };
}

export function createCloudflareRateLimitLimiter(binding: CloudflareRateLimitBinding): AiRateLimiter {
  return {
    async check({ key }) {
      const result = await binding.limit({ key: `svedocs:ai:${key}` });
      return { allowed: result.success };
    }
  };
}

export function resolveCloudflareRateLimiter(
  env: Record<string, unknown> | undefined,
  fallback: AiRateLimiter,
  bindingName = 'SVEDOCS_RATE_LIMITER'
): AiRateLimiter {
  const binding = env?.[bindingName];
  if (!binding || typeof binding !== 'object' || !('limit' in binding)
    || typeof (binding as { limit?: unknown }).limit !== 'function') return fallback;
  return createCloudflareRateLimitLimiter(binding as CloudflareRateLimitBinding);
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
        // KV expires storage independently of the logical window in resetAt.
        await input.namespace.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttlSeconds) });
      }
    }
  });
}
