#!/usr/bin/env node
import { runCreateSvedocsCli } from './index.js';

const result = await runCreateSvedocsCli(process.argv.slice(2));
const output = result.ok ? console.log : console.error;
output(result.message);

if (!result.ok) {
  process.exitCode = 1;
}
