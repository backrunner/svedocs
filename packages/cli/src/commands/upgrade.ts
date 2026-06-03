import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import {
  createInstallCommand,
  describePackageManagerSource,
  detectPackageManagerFromProject,
  formatCommand,
  normalizePackageManagerName,
  resolvePackageManager,
  type PackageManagerChoice
} from '../package-manager.js';
import { fail, ok, type CliResult } from '../result.js';
import { spawnCommand } from '../utils.js';
import { checkUpgradeCompatibility, type CompatibilityReport } from './upgrade-compatibility.js';
import {
  applyDependencyChanges,
  createDependencyChanges,
  createPackageManagerUpgradeCommands,
  findDependency,
  readInstalledDependencyVersion,
  type DependencyChange,
  type PackageJson
} from './upgrade-dependencies.js';

export function renderUpgradeHelp(): string {
  return [
    'svedocs upgrade',
    '',
    'Usage:',
    '  svedocs upgrade [target]',
    '',
    'Arguments:',
    '  target                Version, range, or dist-tag to install. Defaults to latest.',
    '',
    'Options:',
    '  --package-manager <name>',
    '                       auto, pnpm, npm, yarn, or bun',
    '  --pm <name>           Alias for --package-manager',
    '  --no-install          Rewrite package.json without running the package manager',
    '  --dry-run             Print planned changes without writing files or installing',
    '  --check-only          Run compatibility checks without changing dependencies',
    '  --force               Continue through compatibility blockers'
  ].join('\n');
}

export async function runUpgradeCommand(args: string[]): Promise<CliResult> {
  if (args.includes('--help') || args.includes('-h')) return ok('help', args, renderUpgradeHelp());

  const program = new Command('svedocs upgrade')
    .argument('[target]', 'target svedocs version, range, or dist-tag', 'latest')
    .option('--package-manager <name>', 'package manager to use: auto, pnpm, npm, yarn, or bun', 'auto')
    .option('--pm <name>', 'alias for --package-manager')
    .option('--no-install', 'rewrite package.json without running the package manager')
    .option('--dry-run', 'print planned changes without writing files or installing', false)
    .option('--check-only', 'run compatibility checks without changing dependencies', false)
    .option('--force', 'continue through compatibility blockers', false)
    .exitOverride();

  try {
    program.parse(args, { from: 'user' });
  } catch (error) {
    return fail('upgrade', args, formatErrorMessage(error));
  }

  const options = program.opts<{
    packageManager: string;
    pm?: string;
    install: boolean;
    dryRun?: boolean;
    checkOnly?: boolean;
    force?: boolean;
  }>();
  const target = program.args[0] ?? 'latest';
  const requestedPackageManager = options.pm ?? options.packageManager;
  if (!isValidTargetSpec(target)) {
    return fail('upgrade', args, 'Invalid target. Use a version, dist-tag, or package spec without whitespace.');
  }
  if (requestedPackageManager !== 'auto' && !normalizePackageManagerName(requestedPackageManager)) {
    return fail('upgrade', args, `Invalid package manager "${requestedPackageManager}". Use auto, pnpm, npm, yarn, or bun.`);
  }

  const project = await readUpgradeProject(process.cwd());
  if (!project.ok) return fail('upgrade', args, project.message);

  const currentDependency = findDependency(project.pkg, 'svedocs');
  const installedVersion = await readInstalledDependencyVersion(project.root, 'svedocs');
  const currentSpec = installedVersion ?? currentDependency?.spec;
  const compatibility = checkUpgradeCompatibility({
    currentSpecSource: installedVersion ? 'installed package' : currentDependency ? 'package.json' : 'missing dependency',
    targetSpec: target,
    ...(currentSpec ? { currentSpec } : {})
  });
  const changes = createDependencyChanges(project.pkg, target);

  if (compatibility.notices.some((notice) => notice.severity === 'error') && !options.force) {
    return fail('upgrade', args, renderUpgradeReport({
      heading: `svedocs upgrade blocked for ${project.packageJsonPath}.`,
      target,
      changes,
      compatibility,
      footer: 'Re-run with --force after reviewing the compatibility notes.'
    }));
  }

  if (options.checkOnly) {
    return ok('upgrade', args, renderUpgradeReport({
      heading: `svedocs upgrade check for ${project.packageJsonPath}.`,
      target,
      changes,
      compatibility,
      footer: 'No dependency changes were written.'
    }));
  }

  if (options.dryRun) {
    return ok('upgrade', args, renderUpgradeReport({
      heading: `svedocs upgrade dry-run for ${project.packageJsonPath}.`,
      target,
      changes,
      compatibility,
      footer: 'No files were changed.'
    }));
  }

  if (!options.install) {
    const changed = applyDependencyChanges(project.pkg, changes);
    if (changed) await writeFile(project.packageJsonPath, `${JSON.stringify(project.pkg, null, 2)}\n`, 'utf8');
    const installHint = await renderInstallHint(project.root);
    return ok('upgrade', args, renderUpgradeReport({
      heading: changed ? `Updated ${project.packageJsonPath}.` : `${project.packageJsonPath} already targets ${target}.`,
      target,
      changes,
      compatibility,
      footer: `Install skipped. ${installHint}`
    }));
  }

  return runPackageManagerUpgrade({
    args,
    changes,
    compatibility,
    project,
    requestedPackageManager,
    target
  });
}

async function runPackageManagerUpgrade(input: {
  args: string[];
  changes: DependencyChange[];
  compatibility: CompatibilityReport;
  project: UpgradeProject;
  requestedPackageManager: string;
  target: string;
}): Promise<CliResult> {
  let packageManager: PackageManagerChoice;
  try {
    packageManager = await resolvePackageManager({
      requested: input.requestedPackageManager,
      cwd: input.project.root
    });
  } catch (error) {
    return fail('upgrade', input.args, formatErrorMessage(error));
  }

  const commands = createPackageManagerUpgradeCommands(packageManager.name, input.target);
  for (const command of commands) {
    const [bin, ...commandArgs] = command;
    const result = await spawnCommand(bin, commandArgs, {}, { cwd: input.project.root });
    if (!result.ok) {
      return fail('upgrade', input.args, renderUpgradeReport({
        heading: `svedocs upgrade failed while running ${formatCommand(command)}.`,
        target: input.target,
        changes: input.changes,
        compatibility: input.compatibility,
        footer: result.message
      }));
    }
  }

  return ok('upgrade', input.args, renderUpgradeReport({
    heading: `Updated svedocs dependencies with ${describePackageManagerSource(packageManager)}.`,
    target: input.target,
    changes: input.changes,
    compatibility: input.compatibility,
    footer: [
      'Ran:',
      ...commands.map((command) => `  ${formatCommand(command)}`)
    ].join('\n')
  }));
}

interface UpgradeProject {
  packageJsonPath: string;
  pkg: PackageJson;
  root: string;
}

async function readUpgradeProject(cwd: string): Promise<
  | { ok: true; packageJsonPath: string; pkg: PackageJson; root: string }
  | { ok: false; message: string }
> {
  const packageJsonPath = await findProjectPackageJson(cwd);
  if (!packageJsonPath) return { ok: false, message: 'No package.json was found in this directory or its parents.' };
  try {
    const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson;
    return { ok: true, packageJsonPath, pkg, root: path.dirname(packageJsonPath) };
  } catch (error) {
    return { ok: false, message: `Could not read ${packageJsonPath}: ${formatErrorMessage(error)}` };
  }
}

function renderUpgradeReport(input: {
  heading: string;
  target: string;
  changes: DependencyChange[];
  compatibility: CompatibilityReport;
  footer?: string;
}): string {
  const notices = input.compatibility.notices.map((notice) => {
    return `${notice.severity.toUpperCase()} ${notice.code}: ${notice.message}`;
  });
  return [
    input.heading,
    `Target: ${input.target}`,
    'Dependency plan:',
    ...input.changes.map(formatDependencyChange),
    'Compatibility:',
    ...input.compatibility.notes.map((note) => `  ${note}`),
    ...notices.map((notice) => `  ${notice}`),
    ...(input.footer ? [input.footer] : [])
  ].join('\n');
}

function formatDependencyChange(change: DependencyChange): string {
  const from = change.from ?? '(missing)';
  if (change.action === 'keep') return `  ${change.section}.${change.name}: ${change.to} (already set)`;
  return `  ${change.section}.${change.name}: ${from} -> ${change.to}`;
}

async function renderInstallHint(projectRoot: string): Promise<string> {
  const packageManager = await detectPackageManagerFromProject(projectRoot);
  if (!packageManager) return 'Run your package manager install command to refresh the lockfile.';
  return `Run ${formatCommand(createInstallCommand(packageManager))} to refresh the lockfile.`;
}

async function findProjectPackageJson(cwd: string): Promise<string | undefined> {
  let current = path.resolve(cwd);
  while (true) {
    const packageJsonPath = path.join(current, 'package.json');
    try {
      await readFile(packageJsonPath);
      return packageJsonPath;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return undefined;
      current = parent;
    }
  }
}

function isValidTargetSpec(target: string): boolean {
  return target.trim().length > 0 && !/\s/.test(target);
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
