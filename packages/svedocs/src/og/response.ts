const discoveryCacheControl = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

export function createDiscoveryResponse(
  body: string,
  contentType: string,
  request?: Request
): Response {
  const etag = createWeakEtag(body);
  const headers = {
    'cache-control': discoveryCacheControl,
    'content-type': contentType,
    etag
  };
  if (request && matchesEtag(request.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers });
}

export function createDisabledDiscoveryResponse(label: string): Response {
  return new Response(`${label} is disabled.`, {
    status: 404,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createWeakEtag(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
  }
  return `W/"${value.length.toString(16)}-${(hash >>> 0).toString(16)}"`;
}

function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false;
  const expected = stripWeakPrefix(etag);
  return header.split(',').some((candidate) => {
    const value = candidate.trim();
    return value === '*' || stripWeakPrefix(value) === expected;
  });
}

function stripWeakPrefix(etag: string): string {
  return etag.startsWith('W/') ? etag.slice(2) : etag;
}
