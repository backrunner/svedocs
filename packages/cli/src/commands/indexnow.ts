import { createIndexNowPayloads, submitIndexNow } from 'svedocs/integrations';
import { loadProjectManifest } from '../project.js';
import { fail, ok, type CliResult } from '../result.js';
import { readOption } from '../utils.js';

export async function runIndexNowCommand(args: string[]): Promise<CliResult> {
  if (args.includes('--help') || args.includes('-h')) return ok('indexnow', args, [
    'svedocs indexnow [--dry-run] [--config <path>] [--mode edge|static|spa]',
    '',
    'Submit discoverable URLs using integrations.indexNow after deploying the site.',
    '--dry-run prints the payloads without network requests.'
  ].join('\n'));
  try {
    const mode = readOption(args, '--mode');
    if (mode && !['edge', 'static', 'spa'].includes(mode)) return fail('indexnow', args, 'Invalid build mode. Use edge, static, or spa.');
    const manifest = await loadProjectManifest({
      configFile: readOption(args, '--config'),
      ...(mode ? { configOverrides: { build: { mode: mode as 'edge' | 'static' | 'spa' } } } : {})
    });
    const payloads = createIndexNowPayloads(manifest.config, manifest.pages);
    if (args.includes('--dry-run')) return ok('indexnow', args, JSON.stringify({
      endpoint: manifest.config.integrations.indexNow && manifest.config.integrations.indexNow.endpoint,
      payloads
    }, null, 2));
    const result = await submitIndexNow(manifest.config, manifest.pages);
    return ok('indexnow', args, `IndexNow accepted ${result.submitted} URLs in ${result.batches} batches. Acceptance does not guarantee indexing.`);
  } catch (error) {
    return fail('indexnow', args, error instanceof Error ? error.message : String(error));
  }
}
