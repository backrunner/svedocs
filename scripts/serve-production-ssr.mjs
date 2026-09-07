// Production SvelteKit browser-test server without emulated remote Cloudflare bindings.
import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getRequest, setResponse } from '@sveltejs/kit/node';

const site = path.resolve(import.meta.dirname, '../apps/site');
const { Server } = await import(pathToFileURL(path.join(site, '.svelte-kit/output/server/index.js')));
const { manifest } = await import(pathToFileURL(path.join(site, '.svelte-kit/output/server/manifest.js')));
const app = new Server(manifest);
await app.init({ env: {} });
const argument = (name, fallback) => process.argv[process.argv.indexOf(name) + 1] ?? fallback;
const host = process.argv.includes('--host') ? argument('--host', '::1') : '::1';
const port = Number(process.argv.includes('--port') ? argument('--port', '4173') : 4173);
const assetRoots = ['.svelte-kit/output/client', '.svelte-kit/output/prerendered/pages', '.svelte-kit/output/prerendered/dependencies', 'static'].map((dir) => path.join(site, dir));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = createServer(async (incoming, outgoing) => {
  try {
    const request = await getRequest({ request: incoming, base: `http://${incoming.headers.host}` });
    if (['GET', 'HEAD'].includes(request.method)) {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      for (const root of assetRoots) {
        let file = path.resolve(root, `.${pathname}`);
        if (file !== root && !file.startsWith(`${root}${path.sep}`)) continue;
        try {
          if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
          const body = await readFile(file);
          outgoing.setHeader('content-type', mime[path.extname(file)] ?? 'application/octet-stream');
          outgoing.end(request.method === 'HEAD' ? undefined : body);
          return;
        } catch {}
      }
    }
    await setResponse(outgoing, await app.respond(request, { getClientAddress: () => incoming.socket.remoteAddress ?? '::1' }));
  } catch (error) { outgoing.writeHead(500).end(String(error)); }
});
server.listen(port, host);
process.on('SIGTERM', () => { server.close(); server.closeAllConnections(); });
