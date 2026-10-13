// The subset of cloudflare:workers used by this app. Wrangler-generated types
// can replace this declaration when adding more platform APIs.
declare namespace Cloudflare {
  interface Env extends Record<string, unknown> {}
}

declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
  export function waitUntil(promise: Promise<unknown>): void;
}
