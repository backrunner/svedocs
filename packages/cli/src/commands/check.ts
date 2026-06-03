import { checkPackagePublication } from 'svedocs/core';
import { loadProjectManifest } from '../project.js';
import { fail, ok, type CliResult } from '../result.js';
import { readOption } from '../utils.js';

export async function runCheckCommand(args: string[]): Promise<CliResult> {
  const manifest = await loadProjectManifest({
    configFile: readOption(args, '--config'),
    configOverrides: createCheckConfigOverrides(args)
  });
  const strict = args.includes('--strict');
  const packageIssues = args.includes('--package') ? await checkPackagePublication(process.cwd()) : [];
  const allIssues = [...manifest.issues, ...packageIssues];
  const allErrors = allIssues.filter((issue) => issue.severity === 'error');
  const allWarnings = allIssues.filter((issue) => issue.severity === 'warning');
  const summary = `svedocs check: ${manifest.pages.length} pages, ${manifest.search.length} search records, ${allErrors.length} errors, ${allWarnings.length} warnings.`;
  const details = allIssues.map((issue) => `${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
  const message = [summary, ...details].join('\n');
  if (allErrors.length > 0 || (strict && allWarnings.length > 0)) {
    return fail('check', args, message);
  }
  return ok('check', args, message);
}

function createCheckConfigOverrides(args: string[]) {
  const checks: { assets?: boolean; externalLinks?: boolean; translations?: boolean } = {};
  if (args.includes('--external-links')) checks.externalLinks = true;
  if (args.includes('--no-assets')) checks.assets = false;
  if (args.includes('--translations')) checks.translations = true;
  return Object.keys(checks).length ? { checks } : undefined;
}
