import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SvedocsContentIssue } from './types.js';

export async function checkPackagePublication(packageRoot: string): Promise<SvedocsContentIssue[]> {
  const issues: SvedocsContentIssue[] = [];
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    bin?: string | Record<string, string>;
    exports?: Record<string, unknown>;
    files?: string[];
    license?: string;
    private?: boolean;
    publishConfig?: {
      access?: string;
      provenance?: boolean;
    };
  };

  if (!pkg.private && pkg.license !== 'MIT') {
    issues.push({
      code: 'package-license-missing',
      severity: 'error',
      message: 'package.json license must be MIT for public svedocs packages.'
    });
  }

  if (!pkg.private && pkg.publishConfig?.access !== 'public') {
    issues.push({
      code: 'package-publish-access-missing',
      severity: 'warning',
      message: 'package.json publishConfig.access should be public before publishing.'
    });
  }

  if (!pkg.private && pkg.publishConfig?.provenance !== true) {
    issues.push({
      code: 'package-provenance-missing',
      severity: 'warning',
      message: 'package.json publishConfig.provenance should be true for npm provenance.'
    });
  }

  for (const target of extractBinTargets(pkg.bin)) {
    if (!await fileExists(path.join(packageRoot, target))) {
      issues.push({
        code: 'package-bin-missing',
        severity: 'error',
        message: `package.json bin target is missing: ${target}.`
      });
    }
  }

  for (const [exportName, value] of Object.entries(pkg.exports ?? {})) {
    const targets = extractExportTargets(value);
    for (const target of targets) {
      if (!await fileExists(path.join(packageRoot, target))) {
        issues.push({
          code: 'package-export-missing',
          severity: 'error',
          message: `${exportName} points to missing package export target ${target}.`
        });
      }
    }
  }

  for (const file of pkg.files ?? []) {
    if (!await fileExists(path.join(packageRoot, file))) {
      issues.push({
        code: 'package-file-missing',
        severity: 'error',
        message: `package.json files entry is missing: ${file}.`
      });
    }
  }

  return issues;
}

function extractBinTargets(bin: string | Record<string, string> | undefined): string[] {
  if (!bin) return [];
  if (typeof bin === 'string') return [normalizePackageTarget(bin)];
  return Object.values(bin).map(normalizePackageTarget);
}

function extractExportTargets(value: unknown): string[] {
  if (typeof value === 'string') return [normalizePackageTarget(value)];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>).flatMap(extractExportTargets);
}

function normalizePackageTarget(target: string): string {
  return target.replace(/^\.\//, '');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

