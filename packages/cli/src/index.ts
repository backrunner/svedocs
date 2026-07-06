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
  const { command, commandArgs } = normalizeGlobalOptions(args);
  if (command === 'help' || command === '--help' || command === '-h') return ok('help', args, renderSvedocsHelp());
  if (command === 'create') return runCreateSvedocsCli(commandArgs);
  if (command === 'upgrade') return runUpgradeCommand(commandArgs);
  if (command === 'dev') return runViteCommand('dev', commandArgs);
  if (command === 'preview') return runViteCommand('preview', commandArgs);
  if (command === 'build') return runBuildCommand(commandArgs);
  if (command === 'ssg') return runBuildCommand(['--mode', 'static', ...commandArgs]);
  if (command === 'check') return runCheckCommand(commandArgs);
  if (command === 'index') return runIndexCommand(commandArgs);
  if (command === 'og') return runOgCommand(commandArgs);
  if (command === 'deploy') return runDeployCommand(commandArgs);
  return fail(command, args, `Unknown command "${command}".\n\n${renderSvedocsHelp()}`);
}

function normalizeGlobalOptions(args: string[]): { command: string; commandArgs: string[] } {
  const globalOptions: string[] = [];
  let index = 0;
  while (index < args.length) {
    const arg = args[index];
    if (arg === '--config') {
      globalOptions.push(arg);
      if (index + 1 < args.length) globalOptions.push(args[index + 1]!);
      index += index + 1 < args.length ? 2 : 1;
      continue;
    }
    if (arg?.startsWith('--config=')) {
      globalOptions.push(arg);
      index += 1;
      continue;
    }
    break;
  }
  const command = args[index] ?? 'help';
  const commandArgs = args.slice(index + 1);
  return {
    command,
    commandArgs: shouldApplyGlobalOptions(command) ? [...globalOptions, ...commandArgs] : commandArgs
  };
}

function shouldApplyGlobalOptions(command: string): boolean {
  return ['dev', 'preview', 'build', 'ssg', 'check', 'index', 'og', 'deploy'].includes(command);
}
