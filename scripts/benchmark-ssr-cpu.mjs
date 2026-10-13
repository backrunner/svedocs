import { loadProductionServer } from './load-production-server.mjs';
// Build edge output first. Optional site path allows an isolated reference checkout.
// Node process CPU measurements do not represent billed Cloudflare cpuTimeMs.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cpus } from 'node:os';

const label = process.argv[2] ?? 'current';
assert.match(label, /^[\w-]+$/);
const site = path.resolve(process.argv[3] ?? new URL('../apps/site/', import.meta.url).pathname);
const server = await loadProductionServer(site);
const report = { runtime: `Node ${process.version}`, cpu: cpus()[0]?.model, requestsPerBatch: 500, batches: 5, results: [] };
for (const [name, pathname, extra] of [
  ['home', '/', {}], ['docs', '/docs/configuration', {}],
  ['localized', '/docs/zh/configuration', {}],
  ['uncached', '/docs/zh/configuration', { 'cache-control': 'no-cache' }]
]) {
  const respond = () => server.respond(new Request(`https://svedocs.pwp.sh${pathname}`, {
    headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0', ...extra }
  }), { getClientAddress: () => '127.0.0.1' });
  const expected = await (await respond()).text();
  for (let i = 0; i < 100; i++) await (await respond()).text();
  const samples = [];
  for (let batch = 0; batch < report.batches; batch++) {
    const start = process.cpuUsage();
    for (let i = 0; i < report.requestsPerBatch; i++) {
      const response = await respond();
      assert.equal(response.status, 200);
      assert.equal(await response.text(), expected);
    }
    const cpu = process.cpuUsage(start);
    samples.push((cpu.user + cpu.system) / 1000 / report.requestsPerBatch);
  }
  const result = { name, pathname, cpuMsPerRequest: samples.sort((a, b) => a - b)[2], samples };
  report.results.push(result);
  console.log(JSON.stringify(result));
}
const directory = new URL('../artifacts/worker-cpu/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL(`${label}-node-cpu.json`, directory), `${JSON.stringify(report, null, 2)}\n`);
