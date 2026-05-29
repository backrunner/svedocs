import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const bin = packageJson.bin?.['create-svedocs'];

if (bin !== './bin/create-svedocs.js') {
  throw new Error('create-svedocs bin must point to ./bin/create-svedocs.js');
}

const binPath = path.join(root, bin);
await access(binPath);

const source = await readFile(binPath, 'utf8');
if (!source.includes('svedocs-cli')) {
  throw new Error('create-svedocs shim must delegate to svedocs-cli');
}
