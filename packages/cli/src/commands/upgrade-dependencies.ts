import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PackageManagerName } from '../package-manager.js';

export type DependencySection = 'dependencies' | 'devDependencies' | 'optionalDependencies' | 'peerDependencies';

export type DependencyAction = 'add' | 'keep' | 'update';

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface LocatedDependency {
  section: DependencySection;
  spec: string;
}

export interface DependencyChange {
  action: DependencyAction;
  name: 'svedocs' | 'svedocs-cli';
  section: DependencySection;
  from?: string;
  to: string;
}

const dependencySections: DependencySection[] = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies'
];

export function createDependencyChanges(pkg: PackageJson, target: string): DependencyChange[] {
  return [
    createDependencyChange(pkg, 'svedocs', target, 'dependencies'),
    createDependencyChange(pkg, 'svedocs-cli', target, 'devDependencies')
  ];
}

export function applyDependencyChanges(pkg: PackageJson, changes: DependencyChange[]): boolean {
  let changed = false;
  for (const change of changes) {
    if (change.action === 'keep') continue;
    const dependencies = ensureDependencySection(pkg, change.section);
    dependencies[change.name] = change.to;
    changed = true;
  }
  return changed;
}

export function findDependency(pkg: PackageJson, name: string): LocatedDependency | undefined {
  for (const section of dependencySections) {
    const dependencies = readDependencySection(pkg, section);
    const spec = dependencies?.[name];
    if (typeof spec === 'string') return { section, spec };
  }
  return undefined;
}

export function createPackageManagerUpgradeCommands(
  packageManager: PackageManagerName,
  target: string
): Array<[string, ...string[]]> {
  const framework = createPackageSpec('svedocs', target);
  const cli = createPackageSpec('svedocs-cli', target);
  if (packageManager === 'npm') {
    return [
      ['npm', 'install', '--save', framework],
      ['npm', 'install', '--save-dev', cli]
    ];
  }
  if (packageManager === 'yarn') {
    return [
      ['yarn', 'add', framework],
      ['yarn', 'add', '-D', cli]
    ];
  }
  if (packageManager === 'bun') {
    return [
      ['bun', 'add', framework],
      ['bun', 'add', '--dev', cli]
    ];
  }
  return [
    ['pnpm', 'add', framework],
    ['pnpm', 'add', '-D', cli]
  ];
}

export async function readInstalledDependencyVersion(projectRoot: string, name: string): Promise<string | undefined> {
  try {
    const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'node_modules', name, 'package.json'), 'utf8')) as {
      version?: unknown;
    };
    return typeof packageJson.version === 'string' ? packageJson.version : undefined;
  } catch {
    return undefined;
  }
}

function createDependencyChange(
  pkg: PackageJson,
  name: DependencyChange['name'],
  target: string,
  fallbackSection: DependencySection
): DependencyChange {
  const existing = findDependency(pkg, name);
  const to = createPackageJsonTargetSpec(existing?.spec, target);
  if (!existing) return { action: 'add', name, section: fallbackSection, to };
  if (existing.spec === to) {
    return { action: 'keep', name, section: existing.section, from: existing.spec, to };
  }
  return { action: 'update', name, section: existing.section, from: existing.spec, to };
}

function readDependencySection(pkg: PackageJson, section: DependencySection): Record<string, string> | undefined {
  const value = pkg[section];
  if (!isStringRecord(value)) return undefined;
  return value;
}

function ensureDependencySection(pkg: PackageJson, section: DependencySection): Record<string, string> {
  const existing = readDependencySection(pkg, section);
  if (existing) return existing;
  const next: Record<string, string> = {};
  pkg[section] = next;
  return next;
}

function createPackageJsonTargetSpec(currentSpec: string | undefined, target: string): string {
  if (!isPlainSemver(target)) return target;
  const rangePrefix = currentSpec?.match(/^[~^]/)?.[0];
  return rangePrefix ? `${rangePrefix}${target}` : target;
}

function createPackageSpec(name: DependencyChange['name'], target: string): string {
  return `${name}@${target}`;
}

function isPlainSemver(target: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(target);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === 'string');
}
