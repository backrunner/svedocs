import { runCreateSvedocsCli } from '../../dist/index.js';

const target = process.argv[2];
if (!target) throw new Error('Target path is required.');

const result = await runCreateSvedocsCli([target, '--template', 'docs'], {
  readPackageManagerVersion: async () => '11.1.2'
});

if (!result.ok) {
  console.error(result.message);
  process.exitCode = 1;
} else {
  console.log(result.message);
}
