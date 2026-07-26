import spawn from 'cross-spawn';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type PackageManagerName = 'pnpm' | 'npm' | 'yarn' | 'bun';

export type PackageManagerSource = 'explicit' | 'environment' | 'project' | 'default' | 'fallback';

export interface PackageManagerChoice {
  name: PackageManagerName;
  version?: string;
  source: PackageManagerSource;
  detected?: PackageManagerName;
}

export interface ResolvePackageManagerOptions {
  requested?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  readVersion?: (name: PackageManagerName) => Promise<string | undefined>;
}

const packageManagers: PackageManagerName[] = ['pnpm', 'npm', 'yarn', 'bun'];
const fallbackOrder: PackageManagerName[] = ['pnpm', 'npm', 'yarn', 'bun'];

export async function resolvePackageManager(options: ResolvePackageManagerOptions = {}): Promise<PackageManagerChoice> {
  const requested = normalizePackageManagerName(options.requested);
  if (options.requested && !requested && options.requested !== 'auto') {
    throw new Error(`Invalid package manager "${options.requested}". Use auto, pnpm, npm, yarn, or bun.`);
  }

  const readVersion = options.readVersion ?? readPackageManagerVersion;
  if (requested) {
    const version = await readVersion(requested);
    if (!version) throw new Error(`${requested} was requested but was not found on this machine.`);
    return { name: requested, version, source: 'explicit' };
  }

  const env = options.env ?? process.env;
  const envManager = detectPackageManagerFromEnv(env);
  const projectManager = await detectPackageManagerFromProject(options.cwd ?? process.cwd());
  for (const candidate of [
    envManager ? { name: envManager, source: 'environment' as const } : undefined,
    projectManager ? { name: projectManager, source: 'project' as const } : undefined
  ]) {
    if (!candidate) continue;
    const version = await readVersion(candidate.name);
    if (version) return { ...candidate, version, detected: candidate.name };
  }

  for (const [index, name] of fallbackOrder.entries()) {
    const version = await readVersion(name);
    if (version) {
      const detected = envManager ?? projectManager;
      return {
        name,
        version,
        source: index === 0 ? 'default' : 'fallback',
        ...(detected ? { detected } : {})
      };
    }
  }

  throw new Error('No supported package manager was found. Install pnpm, npm, yarn, or bun and try again.');
}

export function detectPackageManagerFromEnv(env: NodeJS.ProcessEnv = process.env): PackageManagerName | undefined {
  const userAgent = env.npm_config_user_agent;
  const userAgentManager = userAgent ? normalizePackageManagerName(userAgent.split(/[ /]/)[0]) : undefined;
  if (userAgentManager) return userAgentManager;

  const execPath = `${env.npm_execpath ?? ''} ${env.npm_node_execpath ?? ''}`.toLowerCase();
  if (execPath.includes('pnpm')) return 'pnpm';
  if (execPath.includes('yarn')) return 'yarn';
  if (execPath.includes('bun')) return 'bun';
  if (execPath.includes('npm')) return 'npm';
  return undefined;
}

export async function detectPackageManagerFromProject(cwd: string): Promise<PackageManagerName | undefined> {
  for (const directory of ancestors(cwd)) {
    const packageJsonManager = await readPackageManagerField(path.join(directory, 'package.json'));
    if (packageJsonManager) return packageJsonManager;

    if (await fileExists(path.join(directory, 'pnpm-lock.yaml'))) return 'pnpm';
    if (await fileExists(path.join(directory, 'package-lock.json')) || await fileExists(path.join(directory, 'npm-shrinkwrap.json'))) return 'npm';
    if (await fileExists(path.join(directory, 'yarn.lock'))) return 'yarn';
    if (await fileExists(path.join(directory, 'bun.lock')) || await fileExists(path.join(directory, 'bun.lockb'))) return 'bun';
  }
  return undefined;
}

export function createPackageManagerField(choice: PackageManagerChoice): string | undefined {
  return choice.version ? `${choice.name}@${choice.version}` : undefined;
}

export function createInstallCommand(name: PackageManagerName): string[] {
  return name === 'yarn' ? ['yarn', 'install'] : [name, 'install'];
}

export function createRunCommand(name: PackageManagerName, script: string): string[] {
  if (name === 'npm') return ['npm', 'run', script];
  if (name === 'bun') return ['bun', 'run', script];
  return [name, script];
}

export function formatCommand(parts: string[]): string {
  return parts.map(shellQuote).join(' ');
}

export function describePackageManagerSource(choice: PackageManagerChoice): string {
  const version = choice.version ? ` ${choice.version}` : '';
  if (choice.source === 'explicit') return `${choice.name}${version} selected by --package-manager`;
  if (choice.source === 'environment') return `${choice.name}${version} detected from the invoking package manager`;
  if (choice.source === 'project') return `${choice.name}${version} detected from the current project`;
  if (choice.source === 'fallback') {
    const detected = choice.detected ? ` after ${choice.detected} was unavailable` : '';
    return `${choice.name}${version} selected as fallback${detected}`;
  }
  return `${choice.name}${version} selected as the default package manager`;
}

export function normalizePackageManagerName(value: string | undefined): PackageManagerName | undefined {
  if (!value || value === 'auto') return undefined;
  const normalized = value.toLowerCase();
  return packageManagers.includes(normalized as PackageManagerName) ? normalized as PackageManagerName : undefined;
}

export async function readPackageManagerVersion(name: PackageManagerName): Promise<string | undefined> {
  return new Promise((resolve) => {
    const child = spawn(name, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    let output = '';
    child.stdout?.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('close', (code) => {
      resolve(code === 0 ? output.trim().split(/\s+/)[0] : undefined);
    });
    child.on('error', () => {
      resolve(undefined);
    });
  });
}

async function readPackageManagerField(packageJsonPath: string): Promise<PackageManagerName | undefined> {
  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { packageManager?: string };
    return normalizePackageManagerName(packageJson.packageManager?.split('@')[0]);
  } catch {
    return undefined;
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

function ancestors(cwd: string): string[] {
  const directories: string[] = [];
  let current = path.resolve(cwd);
  while (true) {
    directories.push(current);
    const parent = path.dirname(current);
    if (parent === current) return directories;
    current = parent;
  }
}

function shellQuote(value: string): string {
  return /^[a-zA-Z0-9_./:@-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}
