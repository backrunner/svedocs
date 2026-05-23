import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type PublishSiteArgs = {
  projectName: string;
  outputDir: string;
  dryRun: boolean;
  wranglerArgs: string[];
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.resolve(repoRoot, 'apps/site');
const defaultProjectName = 'svedocs';
const defaultOutputDir = path.resolve(siteRoot, '.svelte-kit/cloudflare');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args === 'help') {
    console.log(renderHelp());
    return;
  }

  const outputDir = toAbsolutePath(args.outputDir, repoRoot);
  const buildCommand = ['pnpm', '--filter', '@svedocs/site', 'build'];
  const deployCommand = ['pnpm', 'exec', 'wrangler', 'pages', 'deploy', outputDir, '--project-name', args.projectName, ...args.wranglerArgs];

  if (args.dryRun) {
    console.log(`Dry run: ${formatCommand(buildCommand, { env: { SVEDOCS_BUILD_MODE: 'edge' } })}`);
    console.log(`Dry run: ${formatCommand(deployCommand, { cwd: repoRoot })}`);
    return;
  }

  await runCommand('pnpm', ['--filter', '@svedocs/site', 'build'], {
    cwd: repoRoot,
    env: { SVEDOCS_BUILD_MODE: 'edge' }
  });
  await runCommand('pnpm', ['exec', 'wrangler', 'pages', 'deploy', outputDir, '--project-name', args.projectName, ...args.wranglerArgs], {
    cwd: repoRoot
  });
}

function parseArgs(argv: string[]): PublishSiteArgs | 'help' {
  let projectName = defaultProjectName;
  let outputDir = defaultOutputDir;
  let dryRun = false;
  const wranglerArgs: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;
    if (arg === '--help' || arg === '-h') return 'help';
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--project-name') {
      projectName = readValue(argv, ++index, '--project-name');
      continue;
    }
    if (arg.startsWith('--project-name=')) {
      projectName = arg.slice('--project-name='.length);
      continue;
    }
    if (arg === '--output-dir') {
      outputDir = readValue(argv, ++index, '--output-dir');
      continue;
    }
    if (arg.startsWith('--output-dir=')) {
      outputDir = arg.slice('--output-dir='.length);
      continue;
    }
    if (arg === '--') {
      wranglerArgs.push(...argv.slice(index + 1));
      break;
    }
    wranglerArgs.push(arg);
  }

  return { projectName, outputDir, dryRun, wranglerArgs };
}

function renderHelp(): string {
  return [
    'publish-site',
    '',
    'Usage:',
    '  pnpm publish:site [--project-name <name>] [--output-dir <path>] [--dry-run] [-- <wrangler args...>]',
    '',
    'Defaults:',
    `  --project-name ${defaultProjectName}`,
    `  --output-dir ${path.relative(repoRoot, defaultOutputDir)}`,
    '',
    'Examples:',
    '  pnpm publish:site',
    '  pnpm publish:site --project-name my-pages-project',
    '  pnpm publish:site -- --branch main'
  ].join('\n');
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

function toAbsolutePath(value: string, cwd: string): string {
  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

function formatCommand(parts: string[], options: { cwd?: string; env?: Record<string, string> } = {}): string {
  const envPrefix = options.env
    ? `${Object.entries(options.env).map(([key, value]) => `${key}=${quote(value)}`).join(' ')} `
    : '';
  const cwdPrefix = options.cwd ? `(cd ${quote(options.cwd)} && ` : '';
  const cwdSuffix = options.cwd ? ')' : '';
  return `${envPrefix}${cwdPrefix}${parts.map(quote).join(' ')}${cwdSuffix}`;
}

function quote(value: string): string {
  return /^[a-zA-Z0-9_./:@-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
}

function runCommand(command: string, args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
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
