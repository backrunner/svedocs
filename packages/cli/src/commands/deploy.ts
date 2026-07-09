import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createCloudflareEnvDts,
  createCloudflarePreset,
  createWranglerJsonc,
  createWranglerToml,
  type SvedocsBuildMode
} from 'svedocs/cloudflare';
import { fail, ok, type CliResult } from '../result.js';
import { readOption, spawnCommand } from '../utils.js';
import { loadProjectManifest } from '../project.js';
import { runBuildCommand } from './build.js';

export async function runDeployCommand(args: string[]): Promise<CliResult> {
  const positionals = readDeployPositionals(args);
  const target = positionals[0] ?? 'cloudflare';
  if (target !== 'cloudflare') {
    return fail('deploy', args, `Unknown deploy target "${target}". Use cloudflare.`);
  }
  const action = positionals[1];
  if (action === 'setup' || (!action && args.includes('--write'))) {
    return runCloudflareSetupCommand(args);
  }
  if (action) {
    return fail('deploy', args, `Unknown Cloudflare deploy action "${action}". Use setup or omit the action to deploy.`);
  }
  return runCloudflareDeployCommand(args);
}

async function runCloudflareSetupCommand(args: string[]): Promise<CliResult> {
  const write = args.includes('--write');
  const setupResult = await createCloudflareSetup(args);
  if (!setupResult.ok) return fail('deploy', args, setupResult.message);
  const setup = setupResult.setup;
  if (write) {
    await writeCloudflareSetup(setup);
    return ok('deploy', args, `Wrote ${setup.wranglerFile} and src/app.cloudflare.d.ts for Cloudflare Pages.`);
  }
  return ok('deploy', args, [
    'Cloudflare deploy setup dry-run passed.',
    '',
    `${setup.wranglerFile}:`,
    setup.wrangler.trim(),
    '',
    `Run with --write to create ${setup.wranglerFile} and Cloudflare platform types.`
  ].join('\n'));
}

async function runCloudflareDeployCommand(args: string[]): Promise<CliResult> {
  const setupResult = await createCloudflareSetup(args);
  if (!setupResult.ok) return fail('deploy', args, setupResult.message);
  const setup = setupResult.setup;
  const messages: string[] = [];
  const existingConfig = await findCloudflareConfigFile();
  if (existingConfig) {
    messages.push(`Cloudflare setup detected in ${existingConfig}.`);
  } else {
    await writeCloudflareSetup(setup);
    messages.push(`Initialized Cloudflare Pages deployment with ${setup.wranglerFile} and src/app.cloudflare.d.ts.`);
  }

  const buildResult = await runBuildCommand(createBuildArgs(args, setup.mode));
  messages.push(buildResult.message);
  if (!buildResult.ok) {
    return fail('deploy', args, messages.join('\n'));
  }

  const preset = createCloudflarePreset(setup.mode);
  const deployResult = await spawnCommand('wrangler', [
    'pages',
    'deploy',
    preset.output,
    ...readPassthroughArgs(args)
  ]);
  messages.push(deployResult.message);
  if (!deployResult.ok) {
    messages.push('Install Wrangler with your package manager, or use the cloudflare template which includes it.');
    return fail('deploy', args, messages.join('\n'));
  }
  return ok('deploy', args, messages.join('\n'));
}

async function createCloudflareSetup(args: string[]): Promise<{
  ok: true;
  setup: {
    wrangler: string;
    wranglerFile: 'wrangler.toml' | 'wrangler.jsonc';
    envDts: string;
    mode: SvedocsBuildMode;
  };
} | {
  ok: false;
  message: string;
}> {
  const format = readOption(args, '--format') ?? 'toml';
  if (!isCloudflareConfigFormat(format)) {
    return { ok: false, message: 'Invalid Cloudflare config format. Use toml or jsonc.' };
  }
  const modeResult = readDeployMode(args);
  if (!modeResult.ok) return modeResult;
  const mode = modeResult.mode;
  const manifest = await loadProjectManifest({
    configFile: readOption(args, '--config'),
    configOverrides: mode ? { build: { mode } } : undefined
  });
  return {
    ok: true,
    setup: {
      wrangler: format === 'jsonc' ? createWranglerJsonc(manifest.config) : createWranglerToml(manifest.config),
      wranglerFile: format === 'jsonc' ? 'wrangler.jsonc' : 'wrangler.toml',
      envDts: createCloudflareEnvDts(manifest.config),
      mode: manifest.config.build.mode
    }
  };
}

async function writeCloudflareSetup(setup: { wrangler: string; wranglerFile: string; envDts: string }): Promise<void> {
  await mkdir(path.resolve(process.cwd(), 'src'), { recursive: true });
  await writeFile(path.resolve(process.cwd(), setup.wranglerFile), setup.wrangler, 'utf8');
  await writeFile(path.resolve(process.cwd(), 'src/app.cloudflare.d.ts'), setup.envDts, 'utf8');
}

async function findCloudflareConfigFile(): Promise<string | undefined> {
  for (const file of ['wrangler.toml', 'wrangler.jsonc']) {
    try {
      await access(path.resolve(process.cwd(), file));
      return file;
    } catch {
      // Continue looking for another supported config filename.
    }
  }
  return undefined;
}

function readDeployPositionals(args: string[]): string[] {
  const positionals: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg || arg === '--') break;
    if (arg.startsWith('--')) {
      if (['--config', '--format', '--mode'].includes(arg)) index += 1;
      continue;
    }
    positionals.push(arg);
  }
  return positionals;
}

function readDeployMode(args: string[]): { ok: true; mode: SvedocsBuildMode | undefined } | { ok: false; message: string } {
  const mode = readOption(args, '--mode');
  if (!mode) return { ok: true, mode: undefined };
  if (mode === 'edge' || mode === 'static' || mode === 'spa') return { ok: true, mode };
  return { ok: false, message: 'Invalid build mode. Use edge, static, or spa.' };
}

function createBuildArgs(args: string[], mode: SvedocsBuildMode): string[] {
  const buildArgs = ['--mode', mode];
  const configFile = readOption(args, '--config');
  if (configFile) buildArgs.push('--config', configFile);
  if (args.includes('--no-og')) buildArgs.push('--no-og');
  return buildArgs;
}

function readPassthroughArgs(args: string[]): string[] {
  const index = args.indexOf('--');
  return index >= 0 ? args.slice(index + 1) : [];
}

function isCloudflareConfigFormat(value: string): value is 'toml' | 'jsonc' {
  return value === 'toml' || value === 'jsonc';
}
