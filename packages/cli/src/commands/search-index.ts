import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { syncCloudflareAiSearchIndex } from 'svedocs/search';
import { loadProjectManifest } from '../project.js';
import { fail, ok, type CliResult } from '../result.js';
import {
  readCsvOptions,
  readNonNegativeIntegerOption,
  readOption,
  readOptions,
  readPositiveIntegerOption
} from '../utils.js';

export async function runIndexCommand(args: string[]): Promise<CliResult> {
  const manifest = await loadProjectManifest({ configFile: readOption(args, '--config') });
  const out = readOption(args, '--out');
  const format = readOption(args, '--format') ?? 'json';
  const provider = readOption(args, '--provider') ?? manifest.config.search.provider;
  if (!['json', 'jsonl'].includes(format)) {
    return fail('index', args, 'Invalid index format. Use json or jsonl.');
  }
  const payload = format === 'jsonl'
    ? manifest.search.map((record) => JSON.stringify(record)).join('\n')
    : JSON.stringify(manifest.search, null, 2);
  if (provider === 'cloudflare-ai-search' && !out) {
    return runCloudflareAiSearchIndex(args, manifest);
  }
  if (out) {
    const destination = path.resolve(process.cwd(), out);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${payload}\n`, 'utf8');
    return ok('index', args, `Indexed ${manifest.search.length} records for ${provider} at ${destination}`);
  }
  return ok('index', args, payload);
}

async function runCloudflareAiSearchIndex(
  args: string[],
  manifest: Awaited<ReturnType<typeof loadProjectManifest>>
): Promise<CliResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const namespace = readOption(args, '--namespace') ?? manifest.config.cloudflare.aiSearch.namespace;
  const strategy = readOption(args, '--strategy') ?? 'append';
  if (!['append', 'replace'].includes(strategy)) {
    return fail('index', args, 'Invalid Cloudflare AI Search strategy. Use append or replace.');
  }
  const existingIds = readCsvOptions(args, '--existing');
  const deleteIds = readOptions(args, '--delete');
  const result = await syncCloudflareAiSearchIndex({
    records: manifest.search,
    instanceName: readOption(args, '--instance') ?? manifest.config.cloudflare.aiSearch.instanceName,
    ...(accountId ? { accountId } : {}),
    ...(apiToken ? { apiToken } : {}),
    ...(namespace ? { namespace } : {}),
    ...(args.includes('--dry-run') ? { dryRun: true } : {}),
    ...(args.includes('--wait') ? { waitForCompletion: true } : {}),
    strategy: strategy as 'append' | 'replace',
    batchSize: readPositiveIntegerOption(args, '--batch-size') ?? 10,
    maxRetries: readNonNegativeIntegerOption(args, '--retries') ?? 2,
    ...(existingIds.length ? { existingIds } : {}),
    ...(deleteIds.length ? { deleteIds } : {})
  });
  const details = result.errors.map((error) => `ERROR ${error.id}: ${error.message}`);
  const message = [
    result.dryRun
      ? `Cloudflare AI Search dry-run: ${result.indexed} uploads and ${result.deleted} deletes planned for ${result.instanceName}.`
      : `Cloudflare AI Search indexed ${result.indexed} records and deleted ${result.deleted} items for ${result.instanceName}; ${result.failed} failed.`,
    `Strategy: ${strategy}`,
    `Endpoint: ${result.endpoint}`,
    ...(result.dryRun ? ['Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to upload records.'] : []),
    ...details
  ].join('\n');
  return result.failed > 0 ? fail('index', args, message) : ok('index', args, message);
}
