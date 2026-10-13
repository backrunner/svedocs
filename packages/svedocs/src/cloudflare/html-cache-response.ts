export interface CachedHtml {
  body: Uint8Array<ArrayBuffer>;
  headers: [string, string][];
  expires: number;
}

export function cacheable(response: Response): boolean {
  return response.status === 200 && /^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')
    && !response.headers.has('set-cookie') && !response.headers.has('vary')
    && !response.headers.has('content-encoding') && !response.headers.has('content-range')
    && !/private|no-store|no-cache|max-age\s*=\s*"?0(?:\D|$)/i.test(response.headers.get('cache-control') ?? '')
    && !/\bnonce-/i.test(response.headers.get('content-security-policy') ?? '');
}

export function lifetime(response: Response, maximum: number): number {
  const control = response.headers.get('cache-control') ?? '';
  const age = /\bs-maxage\s*=\s*"?(\d+)/i.exec(control) ?? /\bmax-age\s*=\s*"?(\d+)/i.exec(control);
  return age ? Math.min(maximum, Number(age[1]) * 1000) : maximum;
}

export function replay(entry: CachedHtml, request: Request): Response {
  const headers = new Headers(entry.headers);
  const etag = headers.get('etag');
  const matches = request.headers.get('if-none-match')?.split(',').some((value) =>
    value.trim() === '*' || etag && value.trim().replace(/^W\//, '') === etag.replace(/^W\//, ''));
  if (matches) {
    headers.delete('content-length');
    return new Response(null, { status: 304, headers });
  }
  return new Response(request.method === 'HEAD' ? null : entry.body, { headers });
}

export async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    void response.body?.cancel().catch(() => {});
    return;
  }
  const reader = response.body?.getReader();
  if (!reader) return;
  // Streaming/custom SSR must not hold up a request indefinitely while filling a cache.
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 100);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { void reader.cancel().catch(() => {}); return; }
      chunks.push(value);
    }
    if (timedOut) return;
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return body;
  } finally { clearTimeout(timer); reader.releaseLock(); }
}
