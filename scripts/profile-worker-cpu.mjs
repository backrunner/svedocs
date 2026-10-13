// Build edge output, then run wrangler dev --local with an inspector port.
// Measures sampled workerd activity, not production/billed Cloudflare CPU time.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WebSocket } = require(require.resolve('ws', { paths: [require.resolve('wrangler')] }));

const origin = process.env.SVEDOCS_PROFILE_URL ?? 'http://[::1]:8795';
const inspector = process.env.SVEDOCS_PROFILE_INSPECTOR ?? 'http://127.0.0.1:9239';
const label = process.argv[2] ?? 'current';
assert.match(label, /^[\w-]+$/);
const count = Number(process.env.SVEDOCS_PROFILE_REQUESTS ?? 300);
assert(Number.isInteger(count) && count > 0);
const [target] = await (await fetch(`${inspector}/json`)).json();
const socket = new WebSocket(target.webSocketDebuggerUrl, { origin: 'http://localhost' });
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
  else callback.resolve(message.result);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const report = { runtime: 'local workerd V8 CPU profiler', count, results: [] };
const directory = new URL('../artifacts/worker-cpu/', import.meta.url);
await mkdir(directory, { recursive: true });
try {
  await send('Profiler.enable');
  await send('Profiler.setSamplingInterval', { interval: 100 });
  for (const [name, pathname, extra] of [
    ['home', '/', {}],
    ['docs', '/docs/configuration', {}],
    ['localized', '/docs/zh/configuration', {}],
    ['uncached', '/docs/zh/configuration', { 'cache-control': 'no-cache' }],
    ['agent', '/docs/zh/configuration', { accept: 'text/markdown' }]
  ]) {
    const request = () => fetch(`${origin}${pathname}`, { headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0', ...extra } });
    const initial = await request();
    assert.equal(initial.status, 200, name);
    const expected = await initial.text();
    for (let i = 0; i < 20; i++) await (await request()).arrayBuffer();
    await send('Profiler.start');
    for (let i = 0; i < count; i++) {
      const response = await request();
      assert.equal(response.status, 200, name);
      assert.equal(await response.text(), expected, name);
    }
    const { profile } = await send('Profiler.stop');
    await writeFile(new URL(`${label}-${name}.cpuprofile`, directory), JSON.stringify(profile));
    const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
    const totals = new Map();
    let active = 0;
    profile.samples.forEach((id, index) => {
      const frame = nodes.get(id).callFrame;
      if (['(idle)', '(root)', '(program)'].includes(frame.functionName)) return;
      const duration = profile.timeDeltas[index];
      active += duration;
      const key = `${frame.functionName || '(anonymous)'} ${frame.url}:${frame.lineNumber + 1}`;
      totals.set(key, (totals.get(key) ?? 0) + duration);
    });
    const result = {
      name, pathname, bodyBytes: Buffer.byteLength(expected),
      sampledActiveMsPerRequest: Number((active / count / 1000).toFixed(3)),
      hotspots: [...totals].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([frame, us]) => ({ frame, sampledMs: us / 1000 }))
    };
    report.results.push(result);
    console.log(JSON.stringify(result));
  }
  await writeFile(new URL(`${label}.json`, directory), `${JSON.stringify(report, null, 2)}\n`);
} finally { socket.terminate(); }
