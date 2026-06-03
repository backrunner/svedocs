import { runBuildCommand, runViteCommand } from './commands/build.js';
import { runCheckCommand } from './commands/check.js';
import { runCreateSvedocsCli } from './commands/create.js';
import { runDeployCommand } from './commands/deploy.js';
import { runOgCommand } from './commands/og.js';
import { runIndexCommand } from './commands/search-index.js';
import { runUpgradeCommand } from './commands/upgrade.js';
import { fail, ok, type CliResult } from './result.js';

export { runCreateSvedocsCli, renderCreateSvedocsHelp, type CreateSvedocsRuntime } from './commands/create.js';
export { renderUpgradeHelp } from './commands/upgrade.js';
export type { CliResult } from './result.js';

export function renderSvedocsHelp(): string {
  return [
    'svedocs',
    '',
    'Commands:',
    '  create              Create a new svedocs project',
    '  upgrade             Upgrade svedocs dependencies',
    '  dev                 Start the development server',
    '  build               Build the documentation site',
    '  ssg                 Build a static SSG site',
    '  preview             Preview the built site',
    '  check               Check project configuration and content',
    '  index               Print or write search index records',
    '  og                  Generate Open Graph assets',
    '  deploy              Deploy helpers and provider checks',
    '',
    'Global options:',
    '  --config <path>      Use a specific svedocs config file',
    '',
    'Build options:',
    '  --mode <mode>        Build mode: edge, static, or spa',
    '  --no-og              Skip automatic static OG asset generation',
    '',
    'Check options:',
    '  --strict             Treat warnings as failures',
    '  --external-links     Verify http(s) links with HEAD requests',
    '  --no-assets          Skip local asset existence checks',
    '  --translations       Warn when configured locales are missing doc pages',
    '  --package            Validate package files and exports',
    '',
    'Use --help on a command for more details.'
  ].join('\n');
}

export async function runSvedocsCli(args: string[]): Promise<CliResult> {
  const command = args[0] ?? 'help';
  if (command === 'help' || command === '--help' || command === '-h') return ok('help', args, renderSvedocsHelp());
  if (command === 'create') return runCreateSvedocsCli(args.slice(1));
  if (command === 'upgrade') return runUpgradeCommand(args.slice(1));
  if (command === 'dev') return runViteCommand('dev', args.slice(1));
  if (command === 'preview') return runViteCommand('preview', args.slice(1));
  if (command === 'build') return runBuildCommand(args.slice(1));
  if (command === 'ssg') return runBuildCommand(['--mode', 'static', ...args.slice(1)]);
  if (command === 'check') return runCheckCommand(args.slice(1));
  if (command === 'index') return runIndexCommand(args.slice(1));
  if (command === 'og') return runOgCommand(args.slice(1));
  if (command === 'deploy') return runDeployCommand(args.slice(1));
  return fail(command, args, `Unknown command "${command}".\n\n${renderSvedocsHelp()}`);
}
