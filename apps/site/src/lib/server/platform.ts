// Used by static/SPA builds, which do not run on a Cloudflare Worker.
export const env: Record<string, unknown> = typeof process === 'undefined' ? {} : process.env;
export function waitUntil(promise: Promise<unknown>): void { void promise.catch(() => {}); }
