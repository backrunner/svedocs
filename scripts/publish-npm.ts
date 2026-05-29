import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ReleaseChannel = 'stable' | 'beta';

type PublishNpmArgs = {
  channel: ReleaseChannel;
  dryRun: boolean;
  skipChecks: boolean;
  allowDirty: boolean;
  otp?: string;
};

type PublishPackage = {
  directory: string;
  tarball: string;
};

type PackageManifest = {
  name: string;
  version: string;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = path.resolve(repoRoot, 'artifacts/npm-local');
const packages: PublishPackage[] = [
  { directory: 'packages/cli', tarball: 'svedocs-cli.tgz' },
  { directory: 'packages/create-svedocs', tarball: 'create-svedocs.tgz' }
];

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

  const manifests = await readPackageManifests(packages);
  validatePackageVersions(manifests, args.channel);
  const npmTag = args.channel === 'stable' ? 'latest' : 'beta';

  if (!args.dryRun && !args.allowDirty) {
    await assertCleanGitWorktree();
  }

  if (!args.dryRun) {
    await runCommand('npm', ['whoami'], { cwd: repoRoot });
  }

  if (!args.skipChecks) {
    await runCommand('pnpm', ['release:check'], { cwd: repoRoot });
  }

  await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });

  for (const item of packages) {
    const packageRoot = path.resolve(repoRoot, item.directory);
    const tarballPath = path.resolve(artifactsDir, item.tarball);
    await runCommand('pnpm', ['pack', '--out', path.relative(packageRoot, tarballPath)], {
      cwd: packageRoot
    });
  }

  for (const item of packages) {
    const tarballPath = path.resolve(artifactsDir, item.tarball);
    const publishArgs = [
      'publish',
      tarballPath,
      '--access',
      'public',
      '--tag',
      npmTag,
      ...(args.dryRun ? ['--dry-run'] : []),
      ...(args.otp ? ['--otp', args.otp] : [])
    ];
    await runCommand('npm', publishArgs, { cwd: repoRoot });
  }
}

function parseArgs(argv: string[]): PublishNpmArgs | 'help' {
  let channel: ReleaseChannel | undefined;
  let dryRun = false;
  let skipChecks = false;
  let allowDirty = false;
  let otp: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;
    if (arg === '--') continue;
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
    if (arg === '--channel') {
      channel = parseChannel(readValue(argv, ++index, '--channel'));
      continue;
    }
    if (arg.startsWith('--channel=')) {
      channel = parseChannel(arg.slice('--channel='.length));
      continue;
    }
    if (arg === '--otp') {
      otp = readValue(argv, ++index, '--otp');
      continue;
    }
    if (arg.startsWith('--otp=')) {
      otp = arg.slice('--otp='.length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}.`);
  }

  if (!channel) {
    throw new Error('Missing required --channel stable|beta.');
  }

  return { channel, dryRun, skipChecks, allowDirty, ...(otp ? { otp } : {}) };
}

function parseChannel(value: string): ReleaseChannel {
  if (value === 'stable' || value === 'beta') return value;
  throw new Error(`Unsupported release channel: ${value}. Use stable or beta.`);
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

async function readPackageManifests(items: PublishPackage[]): Promise<Array<PackageManifest & { file: string }>> {
  return Promise.all(items.map(async (item) => {
    const file = path.resolve(repoRoot, item.directory, 'package.json');
    const manifest = JSON.parse(await readFile(file, 'utf8')) as PackageManifest;
    return { file, name: manifest.name, version: manifest.version };
  }));
}

function validatePackageVersions(manifests: Array<PackageManifest & { file: string }>, channel: ReleaseChannel): void {
  const versions = new Set(manifests.map((manifest) => manifest.version));
  if (versions.size !== 1) {
    throw new Error([
      'Release packages must share the same version.',
      ...manifests.map((manifest) => `- ${manifest.name}@${manifest.version} (${path.relative(repoRoot, manifest.file)})`)
    ].join('\n'));
  }

  const version = manifests[0]?.version ?? '';
  const prerelease = version.match(/^\d+\.\d+\.\d+-(.+)$/)?.[1];
  const prereleaseParts = prerelease?.split(/[.-]/) ?? [];

  if (channel === 'stable' && prerelease) {
    throw new Error(`Stable releases must use a final semver version, got ${version}.`);
  }
  if (channel === 'beta' && !prereleaseParts.includes('beta')) {
    throw new Error(`Beta releases must use a beta prerelease version such as 0.1.0-beta.1, got ${version}.`);
  }

  console.log(`Publishing ${manifests.map((manifest) => manifest.name).join(', ')} at ${version} with npm tag ${channel === 'stable' ? 'latest' : 'beta'}.`);
}

function renderHelp(): string {
  return [
    'publish-npm',
    '',
    'Usage:',
    '  pnpm publish:npm -- --channel stable [--dry-run] [--skip-checks] [--allow-dirty] [--otp <code>]',
    '  pnpm publish:npm -- --channel beta [--dry-run] [--skip-checks] [--allow-dirty] [--otp <code>]',
    '',
    'Channels:',
    '  stable  Requires a final semver version and publishes with dist-tag latest.',
    '  beta    Requires a beta prerelease version and publishes with dist-tag beta.',
    '',
    'Notes:',
    '  Local publishing uses your local npm login. It does not use npm tokens or provenance.',
    '  Real publishes require a clean git worktree unless --allow-dirty is passed.',
    '  CI publishing should continue to use Trusted Publishing/OIDC.'
  ].join('\n');
}

async function assertCleanGitWorktree(): Promise<void> {
  const status = await runCommandCapture('git', ['status', '--porcelain'], { cwd: repoRoot });
  if (status.trim()) {
    throw new Error([
      'Git worktree is dirty. Commit or stash changes before publishing.',
      'Use --allow-dirty only if you intentionally want to publish the current working tree.'
    ].join('\n'));
  }
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
