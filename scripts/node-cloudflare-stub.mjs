// Browser tests and CPU benchmarks deliberately run without remote bindings.
export const env = Object.freeze({});
export function waitUntil(promise) { void promise.catch(() => {}); }
