import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { runSvedocsCli } from '../src/index.js';

it('loads a custom project config before IndexNow mode overrides and keeps dry-run offline', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'svedocs-indexnow-cli-'));
  const previous = process.cwd();
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  try {
    process.chdir(root);
    await mkdir(path.join(root, 'custom-docs'), { recursive: true });
    await writeFile(path.join(root, 'custom-docs/index.md'), '---\ntitle: Test\n---\n# Test');
    await writeFile(path.join(root, 'custom.config.mjs'), `export default ${JSON.stringify({
      site: { url: 'https://example.com' },
      content: { root: 'custom-docs', docs: 'custom-docs', include: ['custom-docs/**/*.md'] },
      integrations: { indexNow: { key: 'indexnow-test-key' } }
    })}`);
    const result = await runSvedocsCli(['--config', 'custom.config.mjs', 'indexnow', '--mode', 'static', '--dry-run']);
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.message).payloads[0].urlList).toEqual(['https://example.com/docs/']);
    expect(request).not.toHaveBeenCalled();
    const disabled = await runSvedocsCli(['indexnow', '--dry-run']);
    expect(disabled.ok).toBe(false);
    expect(disabled.message).toContain('Enable integrations.indexNow');
  } finally {
    process.chdir(previous);
    vi.unstubAllGlobals();
    await rm(root, { recursive: true, force: true });
  }
});

it('documents the command without loading project state', async () => {
  expect((await runSvedocsCli(['indexnow', '--help'])).message).toContain('--dry-run');
  expect((await runSvedocsCli(['--help'])).message).toContain('indexnow');
});
