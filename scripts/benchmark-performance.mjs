// Run after building svedocs. Pass --url <production-preview-url> for browser measurements.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { chromium } from '@playwright/test';
import { build, loadConfigFromFile } from 'vite';
import { loadSvedocsContent } from '../packages/svedocs/dist/core.js';
import { searchRecords } from '../packages/svedocs/dist/search/local.js';
import { createContentSession } from '../packages/svedocs/dist/core/content-cache.js';

const root = path.resolve(import.meta.dirname, '..');
const { config: site } = await loadConfigFromFile({ command: 'build', mode: 'production' }, path.join(root, 'apps/site/svedocs.config.ts'), root, 'silent');
const temporary = await mkdtemp(path.join(tmpdir(), 'svedocs-performance-'));
const report = { measuredAt: new Date().toISOString(), node: process.version, platform: `${platform()} ${arch()}`, cpu: cpus()[0]?.model, reference: process.env.SVEDOCS_BENCH_REF ?? 'HEAD' };
const config = { ...site, images: false, checks: { ...site.checks, externalLinks: false } };
const options = { projectRoot: path.join(root, 'apps/site'), config };
const round = (value) => Math.round(value * 10) / 10;
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

try {
  // Compile a temporary reference checkout without touching workspace source or dist.
  const baseline = path.join(temporary, 'baseline');
  await mkdir(baseline);
  await writeFile(path.join(baseline, 'package.json'), '{"type":"module"}');
  await symlink(path.join(root, 'packages/svedocs/node_modules'), path.join(baseline, 'node_modules'), 'dir');
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', report.reference, 'packages/svedocs/src'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  for (const file of files.filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))) {
    const source = execFileSync('git', ['show', `${report.reference}:${file}`], { cwd: root, encoding: 'utf8' });
    const target = path.join(baseline, 'dist', file.replace('packages/svedocs/src/', '').replace(/\.ts$/, '.js'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
  }
  const original = await import(pathToFileURL(path.join(baseline, 'dist/core.js')).href);
  const originalSearch = await import(pathToFileURL(path.join(baseline, 'dist/search/local.js')).href);
  await original.loadSvedocsContent(options);
  await loadSvedocsContent(options);
  const before = [], after = [];
  let manifest;
  for (let pass = 0; pass < 3; pass++) {
    let started = performance.now();
    const reference = await original.loadSvedocsContent(options);
    before.push(performance.now() - started);
    started = performance.now();
    manifest = await loadSvedocsContent(options);
    after.push(performance.now() - started);
    assert.deepEqual(manifest, reference);
  }
  const queries = ['configuration', 'configuration theme', '安装', '安装 配置', 'API配置', 'café', 'svédocs', 'beta channel', '主题', '配置主题', '文档 search'];
  for (const query of queries) {
    for (const locale of [undefined, 'en', 'zh']) {
      const input = { query, locale, limit: 8 };
      assert.deepEqual(searchRecords(manifest.search, input), originalSearch.searchRecords(manifest.search, input));
    }
  }
  report.searchRanking = { referenceComparisons: queries.length * 3, identical: true };
  const projectRoot = path.join(temporary, 'project');
  await cp(path.join(root, 'apps/site/content'), path.join(projectRoot, 'content'), { recursive: true });
  await symlink(path.join(root, 'apps/site/static'), path.join(projectRoot, 'static'), 'dir');
  const session = createContentSession();
  let snapshot = await session.load({ projectRoot, config });
  const file = path.join(projectRoot, 'content/docs/index.md');
  const source = await readFile(file, 'utf8');
  const incremental = [], compiled = [];
  for (let pass = 0; pass < 3; pass++) {
    const versions = new Map(snapshot.pages.map((page) => [page.id, session.version(page.id)]));
    await writeFile(file, `${source}\n\nPerformance measurement ${pass}.\n`);
    const started = performance.now();
    snapshot = await session.load({ projectRoot, config }, new Set([file]));
    incremental.push(performance.now() - started);
    compiled.push(snapshot.pages.filter((page) => versions.get(page.id) !== session.version(page.id)).length);
    assert.deepEqual(snapshot, await loadSvedocsContent({ projectRoot, config }));
  }
  report.content = {
    pages: manifest.pages.length,
    records: manifest.search.length,
    baselineMedianMs: round(median(before)),
    currentMedianMs: round(median(after)),
    incrementalMedianMs: round(median(incremental)),
    samples: { baselineMs: before.map(round), currentMs: after.map(round), incrementalMs: incremental.map(round) },
    incrementalCompiledPages: compiled,
    snapshotsIdentical: true,
    images: false,
    externalLinks: false
  };

  const urlIndex = process.argv.indexOf('--url');
  if (urlIndex >= 0) {
    const origin = process.argv[urlIndex + 1];
    const clientRoot = path.join(root, 'apps/site/.svelte-kit/output/client');
    const vite = JSON.parse(await readFile(path.join(clientRoot, '.vite/manifest.json'), 'utf8'));
    const searchFiles = Object.values(vite).filter((entry) => entry.name === 'search' || entry.name === 'local').map((entry) => entry.file);
    const workerFile = (await readdir(clientRoot, { recursive: true })).find((file) => /worker-[^/]+\.js$/.test(file));
    assert(workerFile, 'Build the official site before measuring browser search');
    const baselineBundle = await build({
      root: baseline, configFile: false, logLevel: 'silent',
      build: { write: false, lib: { entry: path.join(baseline, 'dist/search/local.js'), name: 'SvedocsBaselineSearch', formats: ['iife'] } }
    });
    const baselineCode = (Array.isArray(baselineBundle) ? baselineBundle : [baselineBundle])
      .flatMap((result) => result.output).find((entry) => entry.type === 'chunk').code;
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        window.longTasks = [];
        new PerformanceObserver((list) => window.longTasks.push(...list.getEntries().map((entry) => ({ start: entry.startTime, duration: entry.duration })))).observe({ type: 'longtask', buffered: true });
      });
      await page.goto(`${origin}/docs`, { waitUntil: 'networkidle' });
      const initial = await page.evaluate(() => performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith('.js')).map((entry) => ({ url: entry.name, bytes: entry.decodedBodySize })));
      assert(!initial.some((entry) => searchFiles.some((file) => entry.url.endsWith(file))));
      await page.evaluate(() => { window.longTasks = []; });
      await page.locator('.sd-search-trigger').click();
      await page.getByRole('combobox').fill('configuration');
      await page.getByRole('option').first().waitFor();
      assert.equal(page.workers().length, 1);
      report.browser = {
        version: browser.version(),
        initialJsBytes: initial.reduce((sum, entry) => sum + entry.bytes, 0),
        eagerSearchRequests: 0,
        firstSearchLongTasks: await page.evaluate(() => window.longTasks),
        deferredPayloads: await Promise.all(searchFiles.map(async (file) => {
          const content = await readFile(path.join(clientRoot, file));
          return { file, bytes: content.length, gzip: gzipSync(content).length };
        }))
      };
      await page.getByRole('combobox').press('Escape');
      await page.addScriptTag({ content: baselineCode });
      report.scale = [];
      for (const count of [manifest.search.length, 5000, 20000]) {
        const result = await page.evaluate(async ({ records, count, workerUrl }) => {
          const corpus = count === records.length ? records : Array.from({ length: count }, (_, index) => ({ ...records[index % records.length], id: `benchmark-${index}` }));
          window.longTasks = [];
          const started = performance.now();
          const worker = new Worker(workerUrl, { type: 'module' });
          const warm = [];
          let firstResultMs = 0;
          let queryStart = 0;
          let tickCount = 0;
          const heartbeat = setInterval(() => { tickCount++; }, 16);
          try {
            await new Promise((resolve, reject) => {
              worker.onerror = reject;
              worker.onmessage = async ({ data }) => {
                if (data.type === 'online') {
                  let batchStarted = performance.now();
                  for (let offset = 0; offset < corpus.length; offset += 16) {
                    worker.postMessage({ type: 'records', records: corpus.slice(offset, offset + 16) });
                    if (performance.now() - batchStarted >= 8) {
                      await new Promise((done) => setTimeout(done, 0));
                      batchStarted = performance.now();
                    }
                  }
                  worker.postMessage({ type: 'prepare' });
                }
                if (data.type === 'ready') {
                  worker.postMessage({ type: 'query', id: 0, query: { query: 'configuration', limit: 8 } });
                }
                if (data.type === 'error') reject(new Error(data.message));
                if (data.type === 'result') {
                  if (data.id === 0) firstResultMs = performance.now() - started;
                  else warm.push(performance.now() - queryStart);
                  if (data.id === 20) resolve();
                  else {
                    queryStart = performance.now();
                    worker.postMessage({ type: 'query', id: data.id + 1, query: { query: ['configuration', 'theme', '安装', 'configuration theme'][data.id % 4], limit: 8 } });
                  }
                }
              };
            });
            await new Promise((done) => setTimeout(done, 50));
            warm.sort((a, b) => a - b);
            return { count, firstResultMs, warmMedianMs: (warm[9] + warm[10]) / 2, warmP95Ms: warm[18], heartbeatTicks: tickCount, longTasks: window.longTasks };
          } finally { clearInterval(heartbeat); worker.terminate(); }
        }, { records: manifest.search, count, workerUrl: `${origin}/${workerFile}` });
        const baselineResult = await page.evaluate(async ({ records, count }) => {
          const corpus = count === records.length ? records : Array.from({ length: count }, (_, index) => ({ ...records[index % records.length], id: `benchmark-${index}` }));
          await new Promise((done) => setTimeout(done, 50));
          window.longTasks = [];
          const started = performance.now();
          window.SvedocsBaselineSearch.searchRecords(corpus, { query: 'configuration', limit: 8 });
          const firstResultMs = performance.now() - started;
          const warm = [];
          for (let index = 0; index < 20; index++) {
            await new Promise((done) => setTimeout(done, 0));
            const queryStart = performance.now();
            window.SvedocsBaselineSearch.searchRecords(corpus, { query: ['configuration', 'theme', '安装', 'configuration theme'][index % 4], limit: 8 });
            warm.push(performance.now() - queryStart);
          }
          await new Promise((done) => setTimeout(done, 50));
          warm.sort((a, b) => a - b);
          return { firstResultMs, warmMedianMs: (warm[9] + warm[10]) / 2, warmP95Ms: warm[18], longTasks: window.longTasks };
        }, { records: manifest.search, count });
        report.scale.push({ ...result, baseline: baselineResult });
      }
    } finally { await browser.close(); }
  }
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  await writeFile(path.join(root, 'artifacts/performance.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
