import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(renderHelp());
    return;
  }

  const dryRun = args.includes('--dry-run');
  const changesetArgs = collectPassthroughArgs(args);

  if (dryRun) {
    console.log(`Dry run: ${formatCommand(['pnpm', 'exec', 'changeset', 'publish', ...changesetArgs], { cwd: repoRoot })}`);
    return;
  }

  await runCommand('pnpm', ['exec', 'changeset', 'publish', ...changesetArgs], { cwd: repoRoot });
}

function renderHelp(): string {
  return [
    'publish-cli',
    '',
    'Usage:',
    '  pnpm publish:cli [--dry-run] [-- <changeset publish args...>]',
    '',
    'Examples:',
    '  pnpm publish:cli',
    '  pnpm publish:cli -- --tag next',
    '  pnpm publish:cli --dry-run'
  ].join('\n');
}

function collectPassthroughArgs(args: string[]): string[] {
  const passthroughIndex = args.indexOf('--');
  const rawArgs = passthroughIndex >= 0 ? args.slice(passthroughIndex + 1) : args;
  return rawArgs.filter((arg) => arg !== '--dry-run' && arg !== '--help' && arg !== '-h');
}

function formatCommand(parts: string[], options: { cwd?: string } = {}): string {
  const cwdPrefix = options.cwd ? `(cd ${quote(options.cwd)} && ` : '';
  const cwdSuffix = options.cwd ? ')' : '';
  return `${cwdPrefix}${parts.map(quote).join(' ')}${cwdSuffix}`;
}

function quote(value: string): string {
  return /^[a-zA-Z0-9_./:@-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
}

function runCommand(command: string, args: string[], options: { cwd?: string } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 0}.`));
      }
    });
    child.on('error', reject);
  });
}
