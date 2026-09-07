import { mkdtemp, mkdir, writeFile, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContentSession } from '../src/core/content-cache';
import { loadSvedocsContent } from '../src/core/content';
import * as compiler from '../src/core/content-page';
import { createRefreshQueue } from '../src/vite/refresh';
import { svedocs } from '../src/vite';
import * as components from '../src/vite/components';

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'svedocs-incremental-'));
  directories.push(root);
  await mkdir(path.join(root, 'content/docs'), { recursive: true });
  await writeFile(path.join(root, 'content/docs/a.md'), '# A\n\n## First\n\nSome documentation. [B](./b.md#second)');
  await writeFile(path.join(root, 'content/docs/b.md'), '# B\n\n## Second\n\nMore documentation.');
  return root;
}

describe('incremental content snapshots', () => {
  it('recompiles one edited page, rechecks inbound anchors, and preserves cached navigation', async () => {
    const root = await fixture();
    const options = { projectRoot: root, config: { images: false as const } };
    const compiled = vi.spyOn(compiler, 'loadContentFile');
    const session = createContentSession();
    const first = await session.load(options);
    expect(compiled).toHaveBeenCalledTimes(2);
    expect(await session.load(options)).toEqual(first);
    expect(compiled).toHaveBeenCalledTimes(2);
    await writeFile(path.join(root, 'content/docs/b.md'), '# B\n\n## Changed\n\nMore documentation.');
    const next = await session.load(options);
    expect(compiled).toHaveBeenCalledTimes(3);
    expect(next.issues.some((issue) => issue.code === 'broken-anchor')).toBe(true);
    expect(first.pages[0]?.next?.title).toBe('B');
    expect(next).toEqual(await loadSvedocsContent(options));
    await rm(path.join(root, 'content/docs/b.md'));
    const removed = await session.load(options);
    expect(removed.pages[0]?.next).toBeUndefined();
    expect(removed).toEqual(await loadSvedocsContent(options));
  });

  it('refreshes route-dependent output on slug changes, additions and config changes', async () => {
    const root = await fixture();
    const options = { projectRoot: root, config: { images: false as const } };
    const session = createContentSession();
    await session.load(options);
    for (const source of ['---\nslug: renamed\n---\n# B\n\nBody.', '# B\n\nRestored.']) {
      await writeFile(path.join(root, 'content/docs/b.md'), source);
      expect(await session.load(options)).toEqual(await loadSvedocsContent(options));
    }
    await writeFile(path.join(root, 'content/docs/c.svx'), '# C\n\n## Heading\n\nThird page.');
    expect(await session.load(options)).toEqual(await loadSvedocsContent(options));
    await rename(path.join(root, 'content/docs/c.svx'), path.join(root, 'content/docs/renamed.svx'));
    expect(await session.load(options)).toEqual(await loadSvedocsContent(options));
    const updated = { ...options, config: { ...options.config, site: { title: 'New title' } } };
    expect(await session.load(updated)).toEqual(await loadSvedocsContent(updated));
  });

  it('does not reuse plugin output when arbitrary custom plugins are configured', async () => {
    const root = await fixture();
    const transformed = vi.fn();
    const session = createContentSession();
    const options = { projectRoot: root, config: { images: false as const, markdown: { remarkPlugins: [() => transformed] } } };
    await session.load(options);
    await session.load(options);
    expect(transformed).toHaveBeenCalledTimes(4);
  });

  it('tracks missing image candidates and refreshes when an image appears', async () => {
    const root = await fixture();
    await writeFile(path.join(root, 'content/docs/a.md'), '# A\n\n![Image](/photo.png)');
    const session = createContentSession();
    const options = { projectRoot: root };
    const first = await session.load(options);
    const file = path.join(root, 'static/photo.png');
    expect(session.dependencies().has(file)).toBe(true);
    await mkdir(path.dirname(file), { recursive: true });
    const sharp = (await import('sharp')).default;
    await sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } }).png().toFile(file);
    const next = await session.load(options, new Set([file]));
    expect(next.pages[0]?.html).not.toEqual(first.pages[0]?.html);
    expect(next).toEqual(await loadSvedocsContent(options));
    const untouchedVersion = session.version(next.pages[1]!.id);
    await sharp({ create: { width: 16, height: 16, channels: 3, background: 'blue' } }).png().toFile(file);
    const replaced = await session.load(options, new Set([file]));
    expect(replaced.pages[0]?.html).not.toEqual(next.pages[0]?.html);
    expect(session.version(next.pages[1]!.id)).toBe(untouchedVersion);
    expect(replaced).toEqual(await loadSvedocsContent(options));
    await rm(file);
    expect(await session.load(options, new Set([file]))).toEqual(await loadSvedocsContent(options));
  });

  it('invalidates changed virtual output without invalidating an unchanged page module', async () => {
    const root = await fixture();
    const plugin = svedocs({ config: { images: false } }) as unknown as {
      configResolved(config: { root: string }): Promise<void>;
      load(id: string): Promise<string | { code: string }>;
      handleHotUpdate(ctx: unknown): Promise<Array<{ id: string }>>;
      watchChange(file: string): void;
    };
    await plugin.configResolved({ root });
    const ids = ['\0virtual:svedocs/page/content-docs-a.js', '\0virtual:svedocs/page/content-docs-b.js', '\0virtual:svedocs/search'];
    for (const id of ids) await plugin.load(id);
    const file = path.join(root, 'content/docs/a.md');
    await writeFile(file, '# A\n\nNew body.');
    plugin.watchChange(file);
    // A concurrent browser request can reload output before the HMR hook runs.
    await plugin.load(ids[0]!);
    const modules = new Map(ids.map((id) => [id, { id }]));
    const invalidated: string[] = [];
    const send = vi.fn();
    const changed = await plugin.handleHotUpdate({ file, modules: [...modules.values()], server: { ws: { send }, moduleGraph: { invalidateModule(module: { id: string }) { invalidated.push(module.id); }, getModuleById: (id: string) => modules.get(id) } } });
    expect(invalidated).toEqual([ids[0], ids[2]]);
    expect(changed).toEqual([]);
    expect(send).toHaveBeenCalledWith({ type: 'full-reload' });
  });

  it('caches Svelte content compilation until that page or its dependencies change', async () => {
    const root = await fixture();
    const file = path.join(root, 'content/docs/example.svx');
    await writeFile(file, '# Example\n\nOriginal body.');
    const compiled = vi.spyOn(components, 'loadPageComponent');
    const plugin = svedocs({ config: { images: false } }) as unknown as {
      configResolved(config: { root: string }): Promise<void>;
      load(id: string): Promise<{ code: string }>;
      handleHotUpdate(ctx: unknown): Promise<unknown>;
    };
    await plugin.configResolved({ root });
    const id = '\0virtual:svedocs/component/content-docs-example.svelte';
    const first = await plugin.load(id);
    expect(await plugin.load(id)).toEqual(first);
    expect(compiled).toHaveBeenCalledTimes(1);
    const server = { ws: { send() {} }, moduleGraph: { invalidateModule() {}, getModuleById: () => ({ id }) } };
    const other = path.join(root, 'content/docs/a.md');
    await writeFile(other, '# A\n\nEdited unrelated page.');
    await plugin.handleHotUpdate({ file: other, modules: [], server });
    expect(compiled).toHaveBeenCalledTimes(1);
    await writeFile(file, '# Example\n\nNew body.');
    await plugin.handleHotUpdate({ file, modules: [], server });
    expect((await plugin.load(id)).code).toContain('New body.');
    expect(compiled).toHaveBeenCalledTimes(2);
  });
});

describe('refresh scheduling', () => {
  it('coalesces bursts and serializes events arriving during a refresh', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const batches: string[][] = [];
    const queue = createRefreshQueue(async (files) => {
      batches.push([...files]);
      if (batches.length === 1) await gate;
    });
    const first = queue('a');
    const second = queue('b');
    await vi.waitFor(() => expect(batches).toHaveLength(1));
    const third = queue('c');
    release();
    await Promise.all([first, second, third]);
    expect(batches).toEqual([['a', 'b'], ['c']]);
  });

  it('retains failed invalidations for the next attempt', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('Invalid content')).mockResolvedValue(undefined);
    const queue = createRefreshQueue(run);
    await expect(queue('image.png')).rejects.toThrow('Invalid content');
    await queue();
    expect(run.mock.calls[1]?.[0]).toEqual(new Set(['image.png']));
  });
});
