import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type PublishSiteLocalArgs = {
  projectName: string;
  outputDir: string;
  branch: string;
  dryRun: boolean;
  skipChecks: boolean;
  allowDirty: boolean;
  commitDirty: boolean;
  wranglerArgs: string[];
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.resolve(repoRoot, 'apps/site');
const defaultProjectName = 'svedocs';
const defaultOutputDir = path.resolve(siteRoot, '.svelte-kit/cloudflare');
const defaultBranch = 'main';

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
  const buildFrameworkCommand = ['pnpm', '--filter', 'svedocs', 'build'];
  const checkSiteCommand = ['pnpm', '--filter', '@svedocs/site', 'check'];
  const buildSiteCommand = ['pnpm', '--filter', '@svedocs/site', 'build'];
  const deployCommand = [
    'pnpm',
    'exec',
    'wrangler',
    'pages',
    'deploy',
    outputDir,
    '--project-name',
    args.projectName,
    '--branch',
    args.branch,
    ...(args.commitDirty ? ['--commit-dirty=true'] : []),
    ...args.wranglerArgs
  ];

  if (args.dryRun) {
    if (!args.skipChecks) {
      console.log(`Dry run: ${formatCommand(buildFrameworkCommand, { cwd: repoRoot })}`);
      console.log(`Dry run: ${formatCommand(checkSiteCommand, { cwd: repoRoot })}`);
    }
    console.log(`Dry run: ${formatCommand(buildSiteCommand, { cwd: repoRoot, env: { SVEDOCS_BUILD_MODE: 'edge' } })}`);
    console.log(`Dry run: ${formatCommand(deployCommand, { cwd: repoRoot })}`);
    return;
  }

  if (!args.allowDirty) {
    await assertCleanGitWorktree();
  }

  if (!args.skipChecks) {
    await runCommand('pnpm', ['--filter', 'svedocs', 'build'], { cwd: repoRoot });
    await runCommand('pnpm', ['--filter', '@svedocs/site', 'check'], { cwd: repoRoot });
  }

  await runCommand('pnpm', ['--filter', '@svedocs/site', 'build'], {
    cwd: repoRoot,
    env: { SVEDOCS_BUILD_MODE: 'edge' }
  });
  await runCommand('pnpm', deployCommand.slice(1), { cwd: repoRoot });
}

function parseArgs(argv: string[]): PublishSiteLocalArgs | 'help' {
  let projectName = defaultProjectName;
  let outputDir = defaultOutputDir;
  let branch = defaultBranch;
  let dryRun = false;
  let skipChecks = false;
  let allowDirty = false;
  let commitDirty = true;
  const wranglerArgs: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;
    if (arg === '--' && index === 0) continue;
    if (arg === '--help' || arg === '-h') return 'help';
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--skip-checks') {
      skipChecks = true;
      continue;
    }
    if (arg === '--allow-dirty') {
      allowDirty = true;
      continue;
    }
    if (arg === '--no-commit-dirty') {
      commitDirty = false;
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
    if (arg === '--branch') {
      branch = readValue(argv, ++index, '--branch');
      continue;
    }
    if (arg.startsWith('--branch=')) {
      branch = arg.slice('--branch='.length);
      continue;
    }
    if (arg === '--') {
      wranglerArgs.push(...argv.slice(index + 1));
      break;
    }
    wranglerArgs.push(arg);
  }

  return {
    projectName,
    outputDir,
    branch,
    dryRun,
    skipChecks,
    allowDirty,
    commitDirty,
    wranglerArgs
  };
}

function renderHelp(): string {
  return [
    'publish-site-local',
    '',
    'Usage:',
    '  pnpm publish:site:local [--project-name <name>] [--branch <name>] [--output-dir <path>] [--dry-run] [--skip-checks] [--allow-dirty] [--no-commit-dirty] [-- <wrangler args...>]',
    '',
    'Defaults:',
    `  --project-name ${defaultProjectName}`,
    `  --branch ${defaultBranch}`,
    `  --output-dir ${path.relative(repoRoot, defaultOutputDir)}`,
    '  --commit-dirty=true',
    '',
    'Examples:',
    '  pnpm publish:site:local --dry-run',
    '  pnpm publish:site:local',
    '  pnpm publish:site:local -- --commit-message "Deploy docs"',
    '',
    'Notes:',
    '  This local script mirrors CI: build svedocs, check the official site, build edge output, then deploy with Wrangler.',
    '  Real publishes require a clean git worktree unless --allow-dirty is passed.'
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

async function assertCleanGitWorktree(): Promise<void> {
  const status = await runCommandCapture('git', ['status', '--porcelain'], { cwd: repoRoot });
  if (status.trim()) {
    throw new Error([
      'Git worktree is dirty. Commit or stash changes before publishing the site.',
      'Use --allow-dirty only if you intentionally want to publish the current working tree.'
    ].join('\n'));
  }
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
  return /^[a-zA-Z0-9_./:@=-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
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

function runCommandCapture(command: string, args: string[], options: { cwd?: string } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: process.platform === 'win32'
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 0}.\n${stderr}`));
      }
    });
    child.on('error', reject);
  });
}
