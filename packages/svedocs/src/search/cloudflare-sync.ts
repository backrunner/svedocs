import type { SvedocsSearchRecord } from '../core.js';
import type {
  CloudflareAiSearchSyncDocument,
  CloudflareAiSearchSyncOptions,
  CloudflareAiSearchSyncResult
} from './types.js';
import { chunkArray, stringifyMetadata, uniqueStrings, wait } from './utils.js';

export function createCloudflareAiSearchDocuments(records: SvedocsSearchRecord[]): CloudflareAiSearchSyncDocument[] {
  return records.map((record) => ({
    id: record.id,
    title: record.section ? `${record.title}: ${record.section}` : record.title,
    url: record.url,
    content: [
      `# ${record.section ? `${record.title}: ${record.section}` : record.title}`,
      '',
      `URL: ${record.url}`,
      '',
      record.content
    ].join('\n'),
    metadata: stringifyMetadata({
      svedocs: JSON.stringify({
      id: record.id,
      pageId: record.pageId,
      title: record.title,
      section: record.section ?? '',
      url: record.url
      }),
      locale: record.metadata.locale,
      version: record.metadata.version,
      kind: record.metadata.kind
    })
  }));
}

export async function syncCloudflareAiSearchIndex(
  options: CloudflareAiSearchSyncOptions
): Promise<CloudflareAiSearchSyncResult> {
  const endpoint = options.endpoint ?? createCloudflareAiSearchItemsEndpoint(options);
  const dryRun = options.dryRun ?? (!options.accountId || !options.apiToken);
  const documents = createCloudflareAiSearchDocuments(options.records);
  const uploadIds = documents.map((document) => document.id);
  const deleteIds = createCloudflareDeletePlan(options, uploadIds);
  const result: CloudflareAiSearchSyncResult = {
    provider: 'cloudflare-ai-search',
    instanceName: options.instanceName,
    endpoint,
    dryRun,
    indexed: dryRun ? documents.length : 0,
    deleted: dryRun ? deleteIds.length : 0,
    failed: 0,
    planned: {
      uploadIds,
      deleteIds
    },
    errors: []
  };

  if (dryRun) return result;
  if (!options.apiToken) {
    throw new Error('CLOUDFLARE_API_TOKEN is required to index Cloudflare AI Search.');
  }

  const requestFetch = options.fetch ?? fetch;
  const batchSize = options.batchSize ?? 10;
  const maxRetries = options.maxRetries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 250;

  await processBatches(deleteIds, batchSize, async (itemId) => {
    try {
      await withRetry(() => deleteCloudflareAiSearchItem(endpoint, itemId, options.apiToken!, requestFetch), {
        maxRetries,
        retryDelayMs
      });
      result.deleted += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        id: itemId,
        message: error instanceof Error ? error.message : 'Cloudflare AI Search delete failed.'
      });
    }
  });

  await processBatches(documents, batchSize, async (document) => {
    try {
      await withRetry(() => uploadCloudflareAiSearchDocument(endpoint, document, options, requestFetch), {
        maxRetries,
        retryDelayMs
      });
      result.indexed += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        id: document.id,
        message: error instanceof Error ? error.message : 'Cloudflare AI Search upload failed.'
      });
    }
  });

  return result;
}

function createCloudflareAiSearchItemsEndpoint(options: CloudflareAiSearchSyncOptions): string {
  if (!options.accountId) return 'https://api.cloudflare.com/client/v4/accounts/<account_id>/ai-search/instances/<instance_name>/items';
  const account = encodeURIComponent(options.accountId);
  const instance = encodeURIComponent(options.instanceName);
  if (options.namespace) {
    return `https://api.cloudflare.com/client/v4/accounts/${account}/ai-search/namespaces/${encodeURIComponent(options.namespace)}/instances/${instance}/items`;
  }
  return `https://api.cloudflare.com/client/v4/accounts/${account}/ai-search/instances/${instance}/items`;
}

function createCloudflareAiSearchItemEndpoint(itemsEndpoint: string, itemId: string): string {
  return `${itemsEndpoint.replace(/\/$/, '')}/${encodeURIComponent(itemId)}`;
}

function createCloudflareDeletePlan(options: CloudflareAiSearchSyncOptions, uploadIds: string[]): string[] {
  const explicitDeletes = options.deleteIds ?? [];
  if (options.strategy !== 'replace') return uniqueStrings(explicitDeletes);
  const uploadSet = new Set(uploadIds);
  return uniqueStrings([
    ...explicitDeletes,
    ...(options.existingIds ?? []).filter((itemId) => !uploadSet.has(itemId))
  ]);
}

function createCloudflareItemFilename(document: CloudflareAiSearchSyncDocument): string {
  const safe = document.id.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'svedocs-page';
  return `${safe.slice(0, 124)}.md`;
}

async function deleteCloudflareAiSearchItem(
  endpoint: string,
  itemId: string,
  apiToken: string,
  requestFetch: typeof fetch
): Promise<void> {
  const response = await requestFetch(createCloudflareAiSearchItemEndpoint(endpoint, itemId), {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${apiToken}`
    }
  });
  if (!response.ok) {
    throw new Error(await createCloudflareApiErrorMessage(response, 'delete'));
  }
}

async function uploadCloudflareAiSearchDocument(
  endpoint: string,
  document: CloudflareAiSearchSyncDocument,
  options: CloudflareAiSearchSyncOptions,
  requestFetch: typeof fetch
): Promise<void> {
  const form = new FormData();
  form.append(
    'file',
    new Blob([document.content], { type: 'text/markdown' }),
    createCloudflareItemFilename(document)
  );
  form.append('metadata', JSON.stringify(document.metadata));
  if (typeof options.waitForCompletion === 'boolean') {
    form.append('wait_for_completion', String(options.waitForCompletion));
  }
  const response = await requestFetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.apiToken}`
    },
    body: form
  });
  if (!response.ok) {
    throw new Error(await createCloudflareApiErrorMessage(response, 'upload'));
  }
}

async function createCloudflareApiErrorMessage(response: Response, action: string): Promise<string> {
  const body = await response.text().catch(() => '');
  return `Cloudflare AI Search ${action} returned ${response.status}${body ? `: ${body.slice(0, 500)}` : ''}`;
}

async function processBatches<T>(items: T[], batchSize: number, handler: (item: T) => Promise<void>): Promise<void> {
  for (const batch of chunkArray(items, batchSize)) {
    await Promise.all(batch.map((item) => handler(item)));
  }
}

async function withRetry(action: () => Promise<void>, options: { maxRetries: number; retryDelayMs: number }): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await action();
      return;
    } catch (error) {
      if (attempt >= options.maxRetries) throw error;
      attempt += 1;
      await wait(options.retryDelayMs * attempt);
    }
  }
}
