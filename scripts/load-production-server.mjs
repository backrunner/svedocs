// Load edge output in Node for local SSR checks only. This does not emulate workerd.
import { registerHooks } from 'node:module';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === 'cloudflare:workers'
      ? { url: new URL('./node-cloudflare-stub.mjs', import.meta.url).href, shortCircuit: true }
      : nextResolve(specifier, context);
  }
});

export async function loadProductionServer(site) {
  const generated = path.join(site, '.svelte-kit/cloudflare-tmp/server.js');
  const hasGenerated = await access(generated).then(() => true, () => false);
  let server;
  if (hasGenerated) {
    ({ server } = await import(pathToFileURL(generated)));
  } else {
    // Keep comparison benchmarks usable with SvelteKit 2 reference checkouts.
    const { Server } = await import(pathToFileURL(path.join(site, '.svelte-kit/output/server/index.js')));
    const { manifest } = await import(pathToFileURL(path.join(site, '.svelte-kit/output/server/manifest.js')));
    server = new Server(manifest);
  }
  await server.init({ env: {} });
  return server;
}
