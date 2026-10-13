import { expect, it } from 'vitest';
import type { SvedocsSearchRecord } from '../src/core.js';
import { syncCloudflareAiSearchIndex } from '../src/search.js';

it('keeps Unicode, sanitized and truncated record IDs distinct and stable on upload', async () => {
  const ids = ['docs:安装', 'docs:配置', 'docs:a/b', 'docs:a-b', `${'a'.repeat(140)}:one`, `${'a'.repeat(140)}:two`];
  const records = ids.map((id) => ({ id, pageId: 'docs', title: 'Guide', url: '/docs', content: 'Content', metadata: { locale: 'zh', kind: 'doc' } })) as SvedocsSearchRecord[];
  const filenames: string[] = [];
  for (let run = 0; run < 2; run++) {
    const result = await syncCloudflareAiSearchIndex({
      records, instanceName: 'docs', accountId: 'account', apiToken: 'token', batchSize: 1,
      fetch: async (_input, init) => {
        filenames.push(((init?.body as FormData).get('file') as File).name);
        return new Response('{}');
      }
    });
    expect(result.failed).toBe(0);
    expect(result.indexed).toBe(ids.length);
  }
  expect(new Set(filenames.slice(0, ids.length)).size).toBe(ids.length);
  expect(filenames.slice(ids.length)).toEqual(filenames.slice(0, ids.length));
  expect(filenames.every((name) => name.length <= 128 && /^[a-zA-Z0-9_-]+\.md$/.test(name))).toBe(true);
});
