import { access, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../../skills', import.meta.url));
const destination = fileURLToPath(new URL('../dist/skills', import.meta.url));

await access(source);
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
