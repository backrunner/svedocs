import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createCloudflareEnvDts, createWranglerJsonc, createWranglerToml } from 'svedocs/cloudflare';
import { fail, ok, type CliResult } from '../result.js';
import { readOption } from '../utils.js';
import { loadProjectManifest } from '../project.js';

export async function runDeployCommand(args: string[]): Promise<CliResult> {
  const target = args[0] ?? 'cloudflare';
  if (target !== 'cloudflare') {
    return fail('deploy', args, `Unknown deploy target "${target}". Use cloudflare.`);
  }
  const write = args.includes('--write');
  const format = readOption(args, '--format') ?? 'toml';
  if (!['toml', 'jsonc'].includes(format)) {
    return fail('deploy', args, 'Invalid Cloudflare config format. Use toml or jsonc.');
  }
  const manifest = await loadProjectManifest({ configFile: readOption(args, '--config') });
  const wrangler = format === 'jsonc' ? createWranglerJsonc(manifest.config) : createWranglerToml(manifest.config);
  const wranglerFile = format === 'jsonc' ? 'wrangler.jsonc' : 'wrangler.toml';
  const envDts = createCloudflareEnvDts(manifest.config);
  if (write) {
    await mkdir(path.resolve(process.cwd(), 'src'), { recursive: true });
    await writeFile(path.resolve(process.cwd(), wranglerFile), wrangler, 'utf8');
    await writeFile(path.resolve(process.cwd(), 'src/app.cloudflare.d.ts'), envDts, 'utf8');
    return ok('deploy', args, `Wrote ${wranglerFile} and src/app.cloudflare.d.ts for Cloudflare Pages.`);
  }
  return ok('deploy', args, [
    'Cloudflare deploy dry-run passed.',
    '',
    `${wranglerFile}:`,
    wrangler.trim(),
    '',
    `Run with --write to create ${wranglerFile} and Cloudflare platform types.`
  ].join('\n'));
}
