import { access, cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import cliPackage from '../../package.json';
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
  fetch?: typeof fetch;
  readPackageManagerVersion?: (name: PackageManagerName) => Promise<string | undefined>;
  resolveReleaseVersion?: (channel: 'latest' | 'beta') => Promise<string | undefined>;
}

type TemplateSourceMode = 'auto' | 'github' | 'bundled';
type ReleaseChannel = 'auto' | 'latest' | 'beta';

type ResolvedTemplateSource = {
  directory: string;
  description: string;
  cleanup?: () => Promise<void>;
};

type GitHubTreeResponse = {
  tree?: Array<{
    path?: string;
    type?: string;
  }>;
  truncated?: boolean;
  message?: string;
};

const templateNames = ['minimal', 'docs', 'cloudflare'] as const;
const defaultTemplateRepository = 'backrunner/svedocs';
const defaultTemplateRef = 'main';

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
    '  --channel <name>      auto, latest, or beta. latest falls back to beta',
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
    .option('--channel <name>', 'dependency release channel: auto, latest, or beta', 'auto')
    .option('--force', 'allow writing into an existing directory')
    .exitOverride();
  try {
    program.parse(args, { from: 'user' });
  } catch (error) {
    return fail('create', args, error instanceof Error ? error.message : String(error));
  }
  const target = program.args[0] ?? 'svedocs-app';
  const options = program.opts<{ template: string; packageManager: string; pm?: string; install?: boolean; force?: boolean; channel: string }>();
  const template = options.template;
  if (!templateNames.includes(template as typeof templateNames[number])) {
    return fail('create', args, `Unknown template "${template}". Use minimal, docs, or cloudflare.`);
  }
  if (!isReleaseChannel(options.channel)) {
    return fail('create', args, `Unknown release channel "${options.channel}". Use auto, latest, or beta.`);
  }
  let releaseVersion: string;
  try {
    releaseVersion = await resolveCreateReleaseVersion(options.channel, runtime);
  } catch (error) {
    return fail('create', args, formatErrorMessage(error));
  }
  const destination = path.resolve(process.cwd(), target);
  let destinationState: DestinationState;
  try {
    destinationState = await inspectDestination(destination);
  } catch (error) {
    return fail('create', args, `Could not inspect ${destination}: ${formatErrorMessage(error)}`);
  }
  if (destinationState === 'other') {
    return fail('create', args, `${destination} exists and is not a directory.`);
  }
  if (!options.force && destinationState === 'non-empty-directory') {
    return fail('create', args, `${destination} already exists and is not empty. Re-run with --force to merge template files.`);
  }
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
  let source: ResolvedTemplateSource;
  try {
    source = await resolveTemplateSource(template, runtime);
  } catch (error) {
    return fail('create', args, error instanceof Error ? error.message : String(error));
  }
  await mkdir(path.dirname(destination), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(destination), `.${path.basename(destination)}-svedocs-`));
  try {
    if (await pathExists(destination)) {
      await cp(destination, staging, { recursive: true, force: true, errorOnExist: false });
    }
    await cp(source.directory, staging, { recursive: true, force: Boolean(options.force), errorOnExist: false });
    await installProjectSkills(staging);
    await rewriteTemplatePackageJson(staging, target, packageManager, releaseVersion);
    let installMessage: string | undefined;
    if (options.install) {
      const installCommand = createInstallCommand(packageManager.name);
      const result = await spawnCommand(installCommand[0]!, installCommand.slice(1), {}, { cwd: staging });
      if (!result.ok) return fail('create', args, result.message);
      installMessage = `Installed dependencies with ${packageManager.name}.`;
    }
    await commitStagedDirectory(staging, destination);
    return ok('create', args, renderCreateSuccess({
      destination,
      packageManager,
      template,
      templateSource: source.description,
      installed: Boolean(options.install),
      ...(installMessage ? { installMessage } : {})
    }));
  } finally {
    await rm(staging, { recursive: true, force: true });
    await source.cleanup?.();
  }
}

type DestinationState = 'missing' | 'empty-directory' | 'non-empty-directory' | 'other';

async function inspectDestination(directory: string): Promise<DestinationState> {
  try {
    const details = await stat(directory);
    if (!details.isDirectory()) return 'other';
    return (await readdir(directory)).length === 0 ? 'empty-directory' : 'non-empty-directory';
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) return 'missing';
    throw error;
  }
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function commitStagedDirectory(staging: string, destination: string): Promise<void> {
  if (!await pathExists(destination)) {
    await rename(staging, destination);
    return;
  }
  const backup = `${staging}-backup`;
  await rename(destination, backup);
  try {
    await rename(staging, destination);
    await rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (!await pathExists(destination)) await rename(backup, destination);
    throw error;
  }
}

async function rewriteTemplatePackageJson(
  directory: string,
  target: string,
  packageManager: PackageManagerChoice,
  releaseVersion: string
): Promise<void> {
  const packageJsonPath = path.join(directory, 'package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as Record<string, unknown>;
  pkg.name = createPackageName(target);
  rewriteSvedocsDependencies(pkg, releaseVersion);
  const packageManagerField = createPackageManagerField(packageManager);
  if (packageManagerField) pkg.packageManager = packageManagerField;
  await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

function rewriteSvedocsDependencies(pkg: Record<string, unknown>, releaseVersion: string): void {
  for (const sectionName of ['dependencies', 'devDependencies'] as const) {
    const section = pkg[sectionName];
    if (!section || typeof section !== 'object' || Array.isArray(section)) continue;
    const dependencies = section as Record<string, unknown>;
    if (typeof dependencies.svedocs === 'string') dependencies.svedocs = releaseVersion;
    if (typeof dependencies['svedocs-cli'] === 'string') dependencies['svedocs-cli'] = releaseVersion;
  }
}

function isReleaseChannel(value: string): value is ReleaseChannel {
  return value === 'auto' || value === 'latest' || value === 'beta';
}

async function resolveCreateReleaseVersion(
  channel: ReleaseChannel,
  runtime: CreateSvedocsRuntime
): Promise<string> {
  if (channel === 'auto' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(cliPackage.version)) {
    return cliPackage.version;
  }
  const resolver = runtime.resolveReleaseVersion
    ?? ((releaseChannel: 'latest' | 'beta') => resolveRegistryReleaseVersion(releaseChannel, runtime.fetch ?? fetch));
  if (channel === 'beta') {
    const beta = await resolver('beta');
    if (!beta) throw new Error('No compatible svedocs beta release is available.');
    return beta;
  }
  const latest = await resolver('latest');
  if (latest) return latest;
  const beta = await resolver('beta');
  if (beta) return beta;
  throw new Error('No compatible svedocs latest or beta release is available.');
}

async function resolveRegistryReleaseVersion(
  channel: 'latest' | 'beta',
  fetcher: typeof fetch
): Promise<string | undefined> {
  const packages = ['svedocs', 'svedocs-cli', 'create-svedocs'];
  const versions = await Promise.all(packages.map(async (name) => {
    if (channel === 'beta') {
      const tagsResponse = await fetcher(`https://registry.npmjs.org/-/package/${name}/dist-tags`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5_000)
      });
      if (!tagsResponse.ok) return undefined;
      const tags = await tagsResponse.json() as Record<string, unknown>;
      return typeof tags.beta === 'string' ? tags.beta : undefined;
    }
    const response = await fetcher(`https://registry.npmjs.org/${name}/latest`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) return undefined;
    const metadata = await response.json() as { version?: unknown };
    return typeof metadata.version === 'string' ? metadata.version : undefined;
  }));
  const version = versions[0];
  return version && versions.every((candidate) => candidate === version) ? version : undefined;
}

function createPackageName(target: string): string {
  const name = path.basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return name || 'svedocs-app';
}

async function resolveTemplateSource(template: string, runtime: CreateSvedocsRuntime): Promise<ResolvedTemplateSource> {
  const env = { ...process.env, ...runtime.env };
  const mode = readTemplateSourceMode(env);
  if (mode === 'github') {
    try {
      return await downloadGitHubTemplate(template, env, runtime.fetch ?? fetch);
    } catch (error) {
      throw error;
    }
  }
  return resolveBundledTemplateSource(template);
}

async function resolveBundledTemplateSource(template: string): Promise<ResolvedTemplateSource> {
  const candidates = [
    new URL(`../../templates/${template}`, import.meta.url),
    new URL(`../templates/${template}`, import.meta.url)
  ].map((url) => fileURLToPath(url));
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return { directory: candidate, description: 'bundled' };
    } catch {
      // Try the next layout. Source builds and bundled CLI builds land in different directories.
    }
  }
  throw new Error(`Template "${template}" was not found. Checked: ${candidates.join(', ')}`);
}

async function installProjectSkills(destination: string): Promise<void> {
  const source = await resolveBundledSkillsSource();
  const target = path.join(destination, '.agents', 'skills');
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, force: true, errorOnExist: false });
}

async function resolveBundledSkillsSource(): Promise<string> {
  const candidates = [
    new URL('./skills', import.meta.url),
    new URL('../../../../skills', import.meta.url)
  ].map((url) => fileURLToPath(url));
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Source runs use the repository copy; built packages carry dist/skills.
    }
  }
  throw new Error(`Bundled Agent Skills were not found. Checked: ${candidates.join(', ')}`);
}

function readTemplateSourceMode(env: NodeJS.ProcessEnv): TemplateSourceMode {
  const value = env.SVEDOCS_TEMPLATE_SOURCE ?? 'bundled';
  if (value === 'auto' || value === 'github' || value === 'bundled') return value;
  throw new Error('Invalid SVEDOCS_TEMPLATE_SOURCE. Use auto, github, or bundled.');
}

async function downloadGitHubTemplate(
  template: string,
  env: NodeJS.ProcessEnv,
  fetchTemplate: typeof fetch
): Promise<ResolvedTemplateSource> {
  const repository = env.SVEDOCS_TEMPLATE_REPOSITORY ?? defaultTemplateRepository;
  const ref = env.SVEDOCS_TEMPLATE_REF ?? defaultTemplateRef;
  const prefix = `packages/cli/templates/${template}/`;
  const treeUrl = `https://api.github.com/repos/${repository}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const tree = await fetchJson<GitHubTreeResponse>(fetchTemplate, treeUrl);
  if (tree.truncated) throw new Error(`GitHub template tree for ${repository}@${ref} is truncated.`);
  const files = (tree.tree ?? [])
    .filter((entry): entry is { path: string; type: string } => entry.type === 'blob' && typeof entry.path === 'string')
    .filter((entry) => entry.path.startsWith(prefix));
  if (files.length === 0) throw new Error(`GitHub template "${template}" was not found in ${repository}@${ref}.`);

  const tempRoot = await mkdtemp(path.join(tmpdir(), 'svedocs-template-'));
  const cleanup = async () => {
    await rm(tempRoot, { recursive: true, force: true });
  };

  try {
    for (const file of files) {
      const relativePath = file.path.slice(prefix.length);
      const outputPath = resolveInside(tempRoot, relativePath);
      await mkdir(path.dirname(outputPath), { recursive: true });
      const response = await fetchTemplate(createRawGitHubUrl(repository, ref, file.path), {
        headers: { 'User-Agent': 'create-svedocs' }
      });
      if (!response.ok) {
        throw new Error(`GitHub raw request failed for ${file.path}: ${response.status} ${response.statusText}`);
      }
      await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    }
    return {
      directory: tempRoot,
      description: `GitHub ${repository}@${ref}`,
      cleanup
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function fetchJson<T>(fetchTemplate: typeof fetch, url: string): Promise<T> {
  const response = await fetchTemplate(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'create-svedocs'
    }
  });
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
  return await response.json() as T;
}

function createRawGitHubUrl(repository: string, ref: string, filePath: string): string {
  const pathSegments = filePath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(ref)}/${pathSegments}`;
}

function resolveInside(root: string, relativePath: string): string {
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Template path escapes destination: ${relativePath}`);
  }
  return resolved;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function renderCreateSuccess(input: {
  destination: string;
  packageManager: PackageManagerChoice;
  template: string;
  templateSource: string;
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
    `Template source: ${input.templateSource}.`,
    'Agent Skills: .agents/skills.',
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
