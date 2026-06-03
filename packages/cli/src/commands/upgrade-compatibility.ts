export type CompatibilitySeverity = 'error' | 'warning';

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export interface UpgradeCompatibilityRule {
  code: string;
  introducedIn: string;
  severity: CompatibilitySeverity;
  message: string;
}

export interface CompatibilityNotice {
  code: string;
  severity: CompatibilitySeverity;
  message: string;
}

export interface CompatibilityReport {
  currentVersion?: ParsedVersion;
  targetVersion?: ParsedVersion;
  notes: string[];
  notices: CompatibilityNotice[];
}

export const upgradeCompatibilityRules: UpgradeCompatibilityRule[] = [];

export function checkUpgradeCompatibility(input: {
  currentSpec?: string;
  currentSpecSource: string;
  targetSpec: string;
}): CompatibilityReport {
  const currentVersion = input.currentSpec ? parseVersionSpec(input.currentSpec) : undefined;
  const targetVersion = parseVersionSpec(input.targetSpec);
  const notices: CompatibilityNotice[] = [];
  const notes: string[] = [];

  for (const rule of upgradeCompatibilityRules) {
    const introducedIn = parseVersionSpec(rule.introducedIn);
    if (!introducedIn) continue;
    if (!currentVersion || !targetVersion) {
      notices.push({
        code: 'upgrade-span-unknown',
        severity: 'warning',
        message: `Cannot fully evaluate ${rule.code} because the current or target version is not concrete.`
      });
      continue;
    }
    if (compareVersions(currentVersion, introducedIn) < 0 && compareVersions(targetVersion, introducedIn) >= 0) {
      notices.push({
        code: rule.code,
        severity: rule.severity,
        message: rule.message
      });
    }
  }

  if (!input.currentSpec) {
    notes.push('No existing svedocs dependency was found; this is treated as a fresh install.');
  } else if (!currentVersion) {
    notes.push(`Current svedocs spec "${input.currentSpec}" from ${input.currentSpecSource} is not a concrete version, so version-span checks are limited.`);
  } else {
    notes.push(`Current svedocs version: ${formatVersion(currentVersion)} from ${input.currentSpecSource}.`);
  }

  if (!targetVersion) {
    notes.push(`Target "${input.targetSpec}" is not a concrete version before installation, so version-span checks are limited.`);
  } else {
    notes.push(`Target svedocs version: ${formatVersion(targetVersion)}.`);
  }

  if (upgradeCompatibilityRules.length === 0) {
    notes.push('No breaking upgrade rules are registered yet.');
  }

  return {
    ...(currentVersion ? { currentVersion } : {}),
    ...(targetVersion ? { targetVersion } : {}),
    notes,
    notices
  };
}

function parseVersionSpec(spec: string): ParsedVersion | undefined {
  const match = spec.match(/(?:^|[^0-9])v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return undefined;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (!Number.isInteger(major) || !Number.isInteger(minor) || !Number.isInteger(patch)) return undefined;
  return {
    major,
    minor,
    patch,
    ...(match[4] ? { prerelease: match[4] } : {})
  };
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] > right[key]) return 1;
    if (left[key] < right[key]) return -1;
  }
  return 0;
}

function formatVersion(version: ParsedVersion): string {
  const core = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease ? `${core}-${version.prerelease}` : core;
}
