import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import type { SvedocsResolvedConfig } from '../core/types.js';
import { createIntegrationAssets } from '../integrations/assets.js';

export function serveIntegrationAssets(server: ViteDevServer, config: () => SvedocsResolvedConfig | undefined, staticDirectory: string): void {
  server.middlewares.use(async (request, response, next) => {
    const current = config();
    if (!current || !['GET', 'HEAD'].includes(request.method ?? '')) return next();
    try {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      const name = pathname.slice(1);
      const generated = createIntegrationAssets(current);
      if (!Object.hasOwn(generated, name)) return next();
      const assets = await availableAssets({ [name]: generated[name]! }, staticDirectory);
      if (!Object.hasOwn(assets, name)) return next();
      const body = assets[name];
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end(request.method === 'HEAD' ? '' : body);
    } catch (error) { next(error); }
  });
}

/** User-owned ads.txt can list more sellers; never replace it. */
export async function integrationAssets(config: SvedocsResolvedConfig, staticDirectory: string): Promise<Record<string, string>> {
  return availableAssets(createIntegrationAssets(config), staticDirectory);
}

async function availableAssets(generated: Record<string, string>, staticDirectory: string): Promise<Record<string, string>> {
  for (const [name, source] of Object.entries(generated)) {
    let existing: string;
    try { existing = await readFile(path.join(staticDirectory, name), 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (name !== 'ads.txt' && existing.trim() !== source) throw new Error(`Conflicting IndexNow verification file: ${name}.`);
    delete generated[name];
  }
  return generated;
}
