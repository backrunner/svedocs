import { loadSvedocsConfig } from 'svedocs/config';
import { loadProjectConfig } from '../project.js';
import { fail, ok, type CliResult } from '../result.js';
import { readOption, spawnCommand } from '../utils.js';
import { runConfiguredOgGeneration } from './og.js';

export async function runBuildCommand(args: string[]): Promise<CliResult> {
  const configFile = readOption(args, '--config');
  const config = loadSvedocsConfig(await loadProjectConfig(process.cwd(), configFile) ?? {});
  const mode = readOption(args, '--mode') ?? process.env.SVEDOCS_BUILD_MODE ?? config.build.mode;
  if (!mode || !['edge', 'static', 'spa'].includes(mode)) {
    return fail('build', args, 'Invalid build mode. Use edge, static, or spa.');
  }
  const warning = mode === 'spa'
    ? 'SPA mode prerenders known docs pages and writes a static fallback; hosted Search, Ask AI, and other server-only features need an edge runtime.\n'
    : '';
  const result = await spawnCommand('vite', ['build', ...createViteArgs(args)], {
    SVEDOCS_BUILD_MODE: mode,
    ...createConfigEnv(configFile)
  });
  if (!result.ok) return fail('build', args, `${warning}${result.message}`);
  const ogResult = await runConfiguredOgGeneration(configFile, args, config.seo.ogImage);
  const message = ogResult ? `${result.message}\n${ogResult.message}` : result.message;
  return ok('build', args, `${warning}${message}`);
}

export async function runViteCommand(command: 'dev' | 'preview', args: string[]): Promise<CliResult> {
  const configFile = readOption(args, '--config');
  const result = await spawnCommand('vite', [command, ...createViteArgs(args)], createConfigEnv(configFile));
  return result.ok ? ok(command, args, result.message) : fail(command, args, result.message);
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
