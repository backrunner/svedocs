import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadSvedocsConfig } from 'svedocs/config';
import { checkPackagePublication } from 'svedocs/core';
import { createOgImage, createOgImageInput } from 'svedocs/og';
import { syncCloudflareAiSearchIndex } from 'svedocs/search';
import { runCreateSvedocsCli } from './commands/create.js';
import { runDeployCommand } from './commands/deploy.js';
import { loadProjectConfig, loadProjectManifest } from './project.js';
import { fail, ok, type CliResult } from './result.js';
import {
  readCsvOptions,
  readNonNegativeIntegerOption,
  readOgFonts,
  readOption,
  readOptions,
  readPositiveIntegerOption,
  spawnCommand
} from './utils.js';

export { runCreateSvedocsCli, renderCreateSvedocsHelp, type CreateSvedocsRuntime } from './commands/create.js';
export type { CliResult } from './result.js';

export function renderSvedocsHelp(): string {
  return [
    'svedocs',
    '',
    'Commands:',
    '  create              Create a new svedocs project',
    '  dev                 Start the development server',
    '  build               Build the documentation site',
    '  ssg                 Build a static SSG site',
    '  preview             Preview the built site',
    '  check               Check project configuration and content',
    '  index               Print or write search index records',
    '  og                  Generate Open Graph assets',
    '  deploy              Deploy helpers and provider checks',
    '',
    'Global options:',
    '  --config <path>      Use a specific svedocs config file',
    '',
    'Build options:',
    '  --mode <mode>        Build mode: edge, static, or spa',
    '  --no-og              Skip automatic static OG asset generation',
    '',
    'Check options:',
    '  --strict             Treat warnings as failures',
    '  --external-links     Verify http(s) links with HEAD requests',
    '  --no-assets          Skip local asset existence checks',
    '  --translations       Warn when configured locales are missing doc pages',
    '  --no-version-status  Hide informational deprecated/archived version issues',
    '  --package            Validate package files and exports',
    '',
    'Use --help on a command for more details.'
  ].join('\n');
}

export async function runSvedocsCli(args: string[]): Promise<CliResult> {
  const command = args[0] ?? 'help';
  if (command === 'help' || command === '--help' || command === '-h') return ok('help', args, renderSvedocsHelp());
  if (command === 'create') return runCreateSvedocsCli(args.slice(1));
  if (command === 'dev') return runViteCommand('dev', args.slice(1));
  if (command === 'preview') return runViteCommand('preview', args.slice(1));
  if (command === 'build') return runBuildCommand(args.slice(1));
  if (command === 'ssg') return runBuildCommand(['--mode', 'static', ...args.slice(1)]);
  if (command === 'check') return runCheckCommand(args.slice(1));
  if (command === 'index') return runIndexCommand(args.slice(1));
  if (command === 'og') return runOgCommand(args.slice(1));
  if (command === 'deploy') return runDeployCommand(args.slice(1));
  return fail(command, args, `Unknown command "${command}".\n\n${renderSvedocsHelp()}`);
}

async function runBuildCommand(args: string[]): Promise<CliResult> {
  const configFile = readOption(args, '--config');
  const config = loadSvedocsConfig(await loadProjectConfig(process.cwd(), configFile) ?? {});
  const mode = readOption(args, '--mode') ?? process.env.SVEDOCS_BUILD_MODE ?? config.build.mode;
  if (!mode || !['edge', 'static', 'spa'].includes(mode)) {
    return fail('build', args, 'Invalid build mode. Use edge, static, or spa.');
  }
  const warning = mode === 'spa' ? 'SPA mode is supported but not recommended for docs SEO or edge-native features.\n' : '';
  const result = await spawnCommand('vite', ['build', ...createViteArgs(args)], {
    SVEDOCS_BUILD_MODE: mode,
    ...createConfigEnv(configFile)
  });
  if (!result.ok) return fail('build', args, `${warning}${result.message}`);
  const ogResult = await runConfiguredOgGeneration(configFile, args, config.seo.ogImage);
  const message = ogResult ? `${result.message}\n${ogResult.message}` : result.message;
  return ok('build', args, `${warning}${message}`);
}

async function runViteCommand(command: 'dev' | 'preview', args: string[]): Promise<CliResult> {
  const configFile = readOption(args, '--config');
  const result = await spawnCommand('vite', [command, ...createViteArgs(args)], createConfigEnv(configFile));
  return result.ok ? ok(command, args, result.message) : fail(command, args, result.message);
}

async function runCheckCommand(args: string[]): Promise<CliResult> {
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
  const checks: { assets?: boolean; externalLinks?: boolean; translations?: boolean; versionStatus?: boolean } = {};
  if (args.includes('--external-links')) checks.externalLinks = true;
  if (args.includes('--no-assets')) checks.assets = false;
  if (args.includes('--translations')) checks.translations = true;
  if (args.includes('--no-version-status')) checks.versionStatus = false;
  return Object.keys(checks).length ? { checks } : undefined;
}

function createViteArgs(args: string[]): string[] {
  const output: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (arg === '--') {
      output.push(...args.slice(index + 1));
      break;
    }
    if (arg === '--no-og') continue;
    if (arg === '--mode' || arg === '--config') {
      index += 1;
      continue;
    }
    if (arg.startsWith('--mode=') || arg.startsWith('--config=')) continue;
    output.push(arg);
  }
  return output;
}

function createConfigEnv(configFile: string | undefined): Record<string, string> {
  return configFile ? { SVEDOCS_CONFIG_FILE: configFile } : {};
}

async function runIndexCommand(args: string[]): Promise<CliResult> {
  const manifest = await loadProjectManifest({ configFile: readOption(args, '--config') });
  const out = readOption(args, '--out');
  const format = readOption(args, '--format') ?? 'json';
  const provider = readOption(args, '--provider') ?? manifest.config.search.provider;
  if (!['json', 'jsonl'].includes(format)) {
    return fail('index', args, 'Invalid index format. Use json or jsonl.');
  }
  const payload = format === 'jsonl'
    ? manifest.search.map((record) => JSON.stringify(record)).join('\n')
    : JSON.stringify(manifest.search, null, 2);
  if (provider === 'cloudflare-ai-search' && !out) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const namespace = readOption(args, '--namespace');
    const strategy = readOption(args, '--strategy') ?? 'append';
    if (!['append', 'replace'].includes(strategy)) {
      return fail('index', args, 'Invalid Cloudflare AI Search strategy. Use append or replace.');
    }
    const existingIds = readCsvOptions(args, '--existing');
    const deleteIds = readOptions(args, '--delete');
    const result = await syncCloudflareAiSearchIndex({
      records: manifest.search,
      instanceName: readOption(args, '--instance') ?? manifest.config.cloudflare.aiSearch.instanceName,
      ...(accountId ? { accountId } : {}),
      ...(apiToken ? { apiToken } : {}),
      ...(namespace ? { namespace } : {}),
      ...(args.includes('--dry-run') ? { dryRun: true } : {}),
      ...(args.includes('--wait') ? { waitForCompletion: true } : {}),
      strategy: strategy as 'append' | 'replace',
      batchSize: readPositiveIntegerOption(args, '--batch-size') ?? 10,
      maxRetries: readNonNegativeIntegerOption(args, '--retries') ?? 2,
      ...(existingIds.length ? { existingIds } : {}),
      ...(deleteIds.length ? { deleteIds } : {})
    });
    const details = result.errors.map((error) => `ERROR ${error.id}: ${error.message}`);
    const message = [
      result.dryRun
        ? `Cloudflare AI Search dry-run: ${result.indexed} uploads and ${result.deleted} deletes planned for ${result.instanceName}.`
        : `Cloudflare AI Search indexed ${result.indexed} records and deleted ${result.deleted} items for ${result.instanceName}; ${result.failed} failed.`,
      `Strategy: ${strategy}`,
      `Endpoint: ${result.endpoint}`,
      ...(result.dryRun ? ['Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to upload records.'] : []),
      ...details
    ].join('\n');
    return result.failed > 0 ? fail('index', args, message) : ok('index', args, message);
  }
  if (out) {
    const destination = path.resolve(process.cwd(), out);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${payload}\n`, 'utf8');
    return ok('index', args, `Indexed ${manifest.search.length} records for ${provider} at ${destination}`);
  }
  return ok('index', args, payload);
}

async function runOgCommand(args: string[]): Promise<CliResult> {
  const manifest = await loadProjectManifest({ configFile: readOption(args, '--config') });
  const out = path.resolve(process.cwd(), readOption(args, '--out') ?? (manifest.config.seo.ogImage === false ? 'static/og' : manifest.config.seo.ogImage.outDir));
  const format = readOption(args, '--format') ?? (manifest.config.seo.ogImage === false ? 'svg' : manifest.config.seo.ogImage.format);
  const renderer = readOption(args, '--renderer') ?? (manifest.config.seo.ogImage === false ? 'svg' : manifest.config.seo.ogImage.renderer);
  if (!['svg', 'png'].includes(format)) {
    return fail('og', args, 'Invalid OG format. Use svg or png.');
  }
  if (!['svg', 'satori'].includes(renderer)) {
    return fail('og', args, 'Invalid OG renderer. Use svg or satori.');
  }
  const fonts = await readOgFonts(args);
  if (renderer === 'satori' && fonts.length === 0) {
    return fail('og', args, 'Satori OG rendering requires at least one --font path.');
  }
  const configFile = readOption(args, '--config');
  return generateOgAssets({
    args,
    out,
    format,
    renderer,
    fonts,
    ...(configFile ? { configFile } : {})
  });
}

async function runConfiguredOgGeneration(
  configFile: string | undefined,
  buildArgs: string[],
  ogConfig: ReturnType<typeof loadSvedocsConfig>['seo']['ogImage']
): Promise<CliResult | undefined> {
  if (buildArgs.includes('--no-og')) return undefined;
  if (ogConfig === false) return undefined;
  if (ogConfig.renderer === 'satori') return undefined;
  const manifest = await loadProjectManifest({ configFile });
  return generateOgAssets({
    args: ['og', '--auto'],
    out: path.resolve(process.cwd(), ogConfig.outDir),
    format: ogConfig.format,
    renderer: ogConfig.renderer,
    fonts: [],
    ...(configFile ? { configFile } : {}),
    manifest
  });
}

async function generateOgAssets(input: {
  args: string[];
  out: string;
  format: string;
  renderer: string;
  fonts: Awaited<ReturnType<typeof readOgFonts>>;
  configFile?: string;
  manifest?: Awaited<ReturnType<typeof loadProjectManifest>>;
}): Promise<CliResult> {
  const manifest = input.manifest ?? await loadProjectManifest({ configFile: input.configFile });
  const { out, format, renderer, fonts, args } = input;
  await mkdir(out, { recursive: true });
  const written: string[] = [];
  for (const page of manifest.pages) {
    if (page.hidden) continue;
    const fileName = `${page.routePath === '/' ? 'index' : page.routePath.replace(/^\/+/, '').replace(/[^a-zA-Z0-9]+/g, '-')}.${format}`;
    const destination = path.join(out, fileName);
    const asset = await createOgImage(createOgImageInput(manifest.config, page), {
      format: format as 'svg' | 'png',
      renderer: renderer as 'svg' | 'satori',
      ...(manifest.config.seo.ogImage !== false && typeof manifest.config.seo.ogImage.template === 'function'
        ? { template: manifest.config.seo.ogImage.template }
        : {}),
      ...(fonts.length ? { fonts } : {})
    });
    await writeFile(destination, asset);
    written.push(destination);
  }
  return ok('og', args, `Generated ${written.length} OG ${format.toUpperCase()} files with ${renderer} renderer in ${out}`);
}
