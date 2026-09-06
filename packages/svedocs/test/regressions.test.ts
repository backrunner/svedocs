import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { Component } from 'svelte';
import { loadSvedocsContent, resolveSvedocsConfig } from '../src/core';
import { createAskResponse, createCloudflareKvRateLimiter, createMockAiProvider, createWorkersAiProvider } from '../src/ai';
import { createAgentCacheVersion, createSvedocsAgentHandle } from '../src/agent';
import { createAskAiController } from '../src/theme/headless';
import { trimChatHistory } from '../src/ai/history';
import { loadSvedocsPage } from '../src/routes';
import { createFixturePage } from '../src/testing';
import { svedocs } from '../src/vite';
import { findActiveHeading } from '../src/theme/controllers/toc';
import type { SvedocsVitePluginOptions } from '../src/vite';

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(path.join(tmpdir(), 'svedocs-regression-'));
  directories.push(root);
  for (const [file, source] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), source);
  }
  return root;
}

function plugin(options: SvedocsVitePluginOptions = {}) {
  return svedocs({ config: { images: false }, ...options }) as unknown as {
    configResolved(config: { root: string }): Promise<void>;
    buildStart: (this: { addWatchFile(file: string): void }) => Promise<void>;
    load(id: string): Promise<string | { code: string }>;
  };
}

describe('content and component loading', () => {
  it('preserves fenced comments and explicit titles across both rendering paths', async () => {
    const root = await fixture({
      'content/docs/shell.svx': '---\ntitle: Shell Guide\n---\n\n```bash\n# KEEP_THIS_COMMENT\necho hello\n```',
      'content/docs/title.md': '```bash\n# This is not a page title\n```\n\n# Actual title\n\nBody.',
      'content/pages/index.md': '# Title only'
    });
    const manifest = await loadSvedocsContent({ projectRoot: root, config: { images: false } });
    expect(manifest.pages.find((page) => page.routePath === '/docs/title')?.title).toBe('Actual title');
    const shell = manifest.pages.find((page) => page.routePath === '/docs/shell')!;
    const vite = plugin();
    await vite.configResolved({ root });
    const result = await vite.load(`\0virtual:svedocs/component/${shell.id}.svelte`) as { code: string };
    expect(result.code).toContain('KEEP_THIS_COMMENT');
    expect(shell.html).toContain('KEEP_THIS_COMMENT');
    const markdown = await vite.load('\0virtual:svedocs/markdown') as string;
    expect(markdown).toContain('"content-pages-index":""');
  });

  it('loads only the selected component and layout, in parallel with its page data', async () => {
    const page = createFixturePage({ frontmatter: { layout: 'custom' } });
    const component = (() => ({})) as Component;
    const unused = vi.fn();
    const load = vi.fn(async () => ({ default: component }));
    const data = await loadSvedocsPage(page, {
      pages: { [page.id]: async () => ({ default: page }) },
      components: { [page.id]: load, unused },
      layouts: { custom: load, unused }
    });
    expect(data).toEqual({ page, content: component, layout: component });
    expect(load).toHaveBeenCalledTimes(2);
    expect(unused).not.toHaveBeenCalled();
    await expect(loadSvedocsPage(page, { pages: {} })).rejects.toThrow('Unknown layout');
  });

  it('emits lazy component maps and avoids compiling the site twice at startup', async () => {
    const root = await fixture({ 'content/docs/index.svx': '# Docs\n\nBody.' });
    const compiled = vi.fn();
    const vite = plugin({
      config: { images: false, markdown: { remarkPlugins: [() => compiled] } },
      pageComponents: { '/docs': '$lib/CustomPage.svelte' },
      layouts: { custom: '$lib/CustomLayout.svelte' }
    });
    await vite.configResolved({ root });
    await vite.buildStart.call({ addWatchFile() {} });
    expect(compiled).toHaveBeenCalledTimes(1);
    expect(await vite.load('\0virtual:svedocs/component-loaders')).toContain('() => import("$lib/CustomPage.svelte")');
    expect(await vite.load('\0virtual:svedocs/layout-loaders')).toContain('() => import("$lib/CustomLayout.svelte")');
  });
});

describe('Ask AI', () => {
  it('keeps KV storage TTL valid while enforcing the original rate-limit window', async () => {
    let now = 100_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    let saved: string | undefined;
    const limiter = createCloudflareKvRateLimiter({
      windowMs: 60_000, max: 1,
      namespace: {
        async get() { return saved ? JSON.parse(saved) : null; },
        async put(_key, value, options) {
          if (options?.expirationTtl !== undefined && options.expirationTtl < 60) throw new Error('KV TTL below 60 seconds');
          saved = value;
        }
      }
    });
    const input = { key: 'user', request: new Request('https://example.test') };
    expect((await limiter.check(input)).allowed).toBe(true);
    now += 2000;
    expect(await limiter.check(input)).toEqual({ allowed: false, retryAfter: 58 });
    now += 58_000;
    expect((await limiter.check(input)).allowed).toBe(true);
  });

  it('provides actual source text to Workers AI and respects the locale', async () => {
    const run = vi.fn(async () => ({ response: 'ZEBRA-741' }));
    await createWorkersAiProvider({ ai: { run } }).ask({
      question: 'setup code', scope: { locale: 'en' },
      records: [
        { id: 'en', pageId: 'en', title: 'Setup', url: '/docs', content: 'The setup code is ZEBRA-741.', metadata: { locale: 'en' } },
        { id: 'zh', pageId: 'zh', title: 'Setup', url: '/docs/zh', content: 'Different setup code HIDDEN-987.', metadata: { locale: 'zh' } }
      ]
    });
    const payload = JSON.stringify(run.mock.calls);
    expect(payload).toContain('ZEBRA-741');
    expect(payload).not.toContain('HIDDEN-987');
  });

  it('continues chatting past 15 turns without losing the visible transcript', async () => {
    const statuses: number[] = [];
    const controller = createAskAiController({
      config: resolveSvedocsConfig({ ai: { enabled: true } }),
      fetcher: async (_url, init) => {
        const response = await createAskResponse(createMockAiProvider(), new Request('https://example.test/api/ask', init));
        statuses.push(response.status);
        return response;
      }
    });
    for (let turn = 0; turn < 22; turn += 1) await controller.send(`Question ${turn}`);
    expect(statuses).toEqual(Array(22).fill(200));
    expect(get(controller.messages)).toHaveLength(44);
    const trimmed = trimChatHistory(Array.from({ length: 40 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: '中文\\"'.repeat(3000) })));
    expect(new TextEncoder().encode(JSON.stringify(trimmed)).byteLength).toBeLessThan(44_100);
    expect(trimmed.length).toBeLessThanOrEqual(28);
  });
});

it('invalidates negotiated markdown when metadata or output configuration changes', async () => {
  const config = resolveSvedocsConfig({ site: { url: 'https://example.test' } });
  const oldPage = createFixturePage({ title: 'Old title', markdown: 'Same body' });
  const newPage = { ...oldPage, title: 'New title', description: 'New description' };
  const store = new Map<string, Response>();
  const request = new Request(`https://example.test${oldPage.routePath}`, { headers: { accept: 'text/markdown' } });
  const event = {
    request, url: new URL(request.url), platform: { caches: { default: {
      async match(key: Request) { return store.get(key.url)?.clone(); },
      async put(key: Request, response: Response) { store.set(key.url, response.clone()); }
    } } }
  };
  for (const page of [oldPage, newPage]) {
    const handle = createSvedocsAgentHandle({ config, pages: [page] });
    const response = await handle({ event, resolve: async () => new Response('HTML') } as never);
    expect(await response.text()).toContain(page.title);
  }
  expect(store.size).toBe(2);
  expect(createAgentCacheVersion([newPage], undefined, config)).not.toBe(createAgentCacheVersion([newPage], undefined, { ...config, site: { ...config.site, url: 'https://other.test' } }));
});

it('selects ToC headings from cached positions, including the final section', () => {
  const headings = [{ top: 0 }, { top: 500 }, { top: 1500 }];
  expect(findActiveHeading(headings, 0, 800)).toBe(headings[1]);
  expect(findActiveHeading(headings, 700, 600)).toBe(headings[1]);
  expect(findActiveHeading(headings, 1600, 800)).toBe(headings[2]);
  expect(findActiveHeading([], 0, 800)).toBeUndefined();
});
