import { access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfigFromFile } from 'vite';
import type { SvedocsConfig } from '../config.js';
import type { SvedocsContentManifest } from '../core/types.js';
import type { SvedocsVitePluginOptions } from '../vite.js';
const defaultConfigFiles = [
  'svedocs.config.ts',
  'svedocs.config.mts',
  'svedocs.config.js',
  'svedocs.config.mjs'
];

export function createServerConfigModule(
  config: SvedocsContentManifest['config'],
  configFile: string | undefined
): string {
  if (!configFile) return `export default ${JSON.stringify(config)};`;
  return [
    `import * as userConfigModule from ${JSON.stringify(configFile)};`,
    `import { loadSvedocsConfig } from 'svedocs/config';`,
    `const userConfig = userConfigModule.default ?? userConfigModule.config ?? {};`,
    `export default loadSvedocsConfig(userConfig);`
  ].join('\n');
}

export function createContentOptions(root: string, config: SvedocsConfig | undefined) {
  const buildConfig = applyBuildModeOverride(config);
  return buildConfig ? { projectRoot: root, config: buildConfig } : { projectRoot: root };
}

export function applyBuildModeOverride(config: SvedocsConfig | undefined): SvedocsConfig | undefined {
  const mode = process.env.SVEDOCS_BUILD_MODE;
  if (mode !== 'edge' && mode !== 'static' && mode !== 'spa') return config;
  return {
    ...(config ?? {}),
    build: {
      ...(config?.build ?? {}),
      mode
    }
  };
}

export async function loadPluginConfig(
  root: string,
  options: SvedocsVitePluginOptions
): Promise<{ config?: SvedocsConfig; configFile?: string }> {
  if (options.config) return { config: options.config };
  const configFile = options.configFile
    ? path.resolve(root, options.configFile)
    : process.env.SVEDOCS_CONFIG_FILE
    ? path.resolve(root, process.env.SVEDOCS_CONFIG_FILE)
    : await findConfigFile(root);
  if (!configFile) return {};
  try {
    const loaded = await loadConfigFromFile(
      {
        command: 'serve',
        mode: process.env.NODE_ENV ?? 'production'
      },
      configFile,
      root,
      'silent'
    );
    if (loaded?.config && typeof loaded.config === 'object') {
      return { config: loaded.config as SvedocsConfig, configFile };
    }
  } catch (error) {
    if (!/\.[cm]?js$/.test(configFile)) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load ${path.relative(root, configFile)}: ${message}`);
    }
  }
  const module = await import(pathToFileURL(configFile).href);
  return { config: (module.default ?? module.config) as SvedocsConfig, configFile };
}

export async function findConfigFile(root: string): Promise<string | undefined> {
  for (const file of defaultConfigFiles) {
    const candidate = path.join(root, file);
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
