import { access, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import {
  createInstallCommand,
  createPackageManagerField,
  createRunCommand,
  describePackageManagerSource,
  formatCommand,
  resolvePackageManager,
  type PackageManagerChoice,
  type PackageManagerName
} from '../package-manager.js';
import { fail, ok, type CliResult } from '../result.js';
import { spawnCommand } from '../utils.js';

export interface CreateSvedocsRuntime {
  env?: NodeJS.ProcessEnv;
  readPackageManagerVersion?: (name: PackageManagerName) => Promise<string | undefined>;
}

export function renderCreateSvedocsHelp(): string {
  return [
    'create-svedocs',
    '',
    'Usage:',
    '  create-svedocs [dir]',
    '',
    'Options:',
    '  --template <name>     minimal, docs, or cloudflare',
    '  --package-manager <name>',
    '                       auto, pnpm, npm, yarn, or bun',
    '  --pm <name>           Alias for --package-manager',
    '  --install             Install dependencies after creating the project',
    '  --force               Allow writing into an existing directory'
  ].join('\n');
}

export async function runCreateSvedocsCli(args: string[], runtime: CreateSvedocsRuntime = {}): Promise<CliResult> {
  if (args.includes('--help') || args.includes('-h')) return ok('help', args, renderCreateSvedocsHelp());
  const program = new Command('create-svedocs')
    .argument('[dir]', 'target directory', 'svedocs-app')
    .option('--template <name>', 'template name', 'docs')
    .option('--package-manager <name>', 'package manager to use: auto, pnpm, npm, yarn, or bun', 'auto')
    .option('--pm <name>', 'alias for --package-manager')
    .option('--install', 'install dependencies after creating the project', false)
    .option('--force', 'allow writing into an existing directory')
    .exitOverride();
  try {
    program.parse(args, { from: 'user' });
  } catch (error) {
    return fail('create', args, error instanceof Error ? error.message : String(error));
  }
  const target = program.args[0] ?? 'svedocs-app';
  const options = program.opts<{ template: string; packageManager: string; pm?: string; install?: boolean; force?: boolean }>();
  const template = options.template;
  if (!['minimal', 'docs', 'cloudflare'].includes(template)) {
    return fail('create', args, `Unknown template "${template}". Use minimal, docs, or cloudflare.`);
  }
  const source = await resolveTemplateSource(template);
  const destination = path.resolve(process.cwd(), target);
  let packageManager: PackageManagerChoice;
  try {
    packageManager = await resolvePackageManager({
      requested: options.pm ?? options.packageManager,
      cwd: process.cwd(),
      ...(runtime.env ? { env: runtime.env } : {}),
      ...(runtime.readPackageManagerVersion ? { readVersion: runtime.readPackageManagerVersion } : {})
    });
  } catch (error) {
    return fail('create', args, error instanceof Error ? error.message : String(error));
  }
  if (!options.force && !await isEmptyOrMissingDirectory(destination)) {
    return fail('create', args, `${destination} already exists and is not empty. Re-run with --force to merge template files.`);
  }
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true, force: Boolean(options.force), errorOnExist: false });
  await rewriteTemplatePackageJson(destination, target, packageManager);
  let installMessage: string | undefined;
  if (options.install) {
    const installCommand = createInstallCommand(packageManager.name);
    const result = await spawnCommand(installCommand[0]!, installCommand.slice(1), {}, { cwd: destination });
    if (!result.ok) return fail('create', args, result.message);
    installMessage = `Installed dependencies with ${packageManager.name}.`;
  }
  return ok('create', args, renderCreateSuccess({
    destination,
    packageManager,
    template,
    installed: Boolean(options.install),
    ...(installMessage ? { installMessage } : {})
  }));
}

async function isEmptyOrMissingDirectory(directory: string): Promise<boolean> {
  try {
    return (await readdir(directory)).length === 0;
  } catch {
    return true;
  }
}

async function rewriteTemplatePackageJson(
  directory: string,
  target: string,
  packageManager: PackageManagerChoice
): Promise<void> {
  const packageJsonPath = path.join(directory, 'package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as Record<string, unknown>;
  pkg.name = createPackageName(target);
  const packageManagerField = createPackageManagerField(packageManager);
  if (packageManagerField) pkg.packageManager = packageManagerField;
  await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

function createPackageName(target: string): string {
  const name = path.basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return name || 'svedocs-app';
}

async function resolveTemplateSource(template: string): Promise<string> {
  const candidates = [
    new URL(`../../templates/${template}`, import.meta.url),
    new URL(`../templates/${template}`, import.meta.url)
  ].map((url) => fileURLToPath(url));
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next layout. Source builds and bundled CLI builds land in different directories.
    }
  }
  throw new Error(`Template "${template}" was not found. Checked: ${candidates.join(', ')}`);
}

function renderCreateSuccess(input: {
  destination: string;
  packageManager: PackageManagerChoice;
  template: string;
  installed: boolean;
  installMessage?: string;
}): string {
  const relativeDestination = path.relative(process.cwd(), input.destination) || '.';
  const cdCommand = ['cd', relativeDestination.startsWith('..') ? input.destination : relativeDestination];
  const installCommand = createInstallCommand(input.packageManager.name);
  const devCommand = createRunCommand(input.packageManager.name, 'dev');
  const buildCommand = createRunCommand(input.packageManager.name, 'build');
  const ssgCommand = createRunCommand(input.packageManager.name, 'build:ssg');
  return [
    `Created ${input.template} svedocs project at ${input.destination}`,
    `Package manager: ${describePackageManagerSource(input.packageManager)}.`,
    ...(input.installMessage ? [input.installMessage] : []),
    '',
    'Next steps:',
    `  ${formatCommand(cdCommand)}`,
    ...(input.installed ? [] : [`  ${formatCommand(installCommand)}`]),
    `  ${formatCommand(devCommand)}`,
    '',
    'Build commands:',
    `  ${formatCommand(buildCommand)}`,
    `  ${formatCommand(ssgCommand)}`
  ].join('\n');
}
