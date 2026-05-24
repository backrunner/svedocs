import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SvedocsConfig } from 'svedocs/config';
import { loadSvedocsContent, type SvedocsContentManifest } from 'svedocs/core';

const defaultConfigFiles = [
  'svedocs.config.ts',
  'svedocs.config.mts',
  'svedocs.config.js',
  'svedocs.config.mjs'
];

export async function loadProjectManifest(options: {
  projectRoot?: string | undefined;
  configFile?: string | undefined;
  configOverrides?: SvedocsConfig | undefined;
} = {}): Promise<SvedocsContentManifest> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const config = await loadProjectConfig(projectRoot, options.configFile);
  const merged = mergeSvedocsConfig(config, options.configOverrides);
  return loadSvedocsContent(merged ? { projectRoot, config: merged } : { projectRoot });
}

export async function loadProjectConfig(
  projectRoot = process.cwd(),
  configFile?: string
): Promise<SvedocsConfig | undefined> {
  const resolvedConfigFile = configFile
    ? path.resolve(projectRoot, configFile)
    : await findConfigFile(projectRoot);
  if (!resolvedConfigFile) return undefined;
  try {
    return await loadConfigWithVite(projectRoot, resolvedConfigFile);
  } catch (error) {
    if (!/\.[cm]?js$/.test(resolvedConfigFile)) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load ${path.relative(projectRoot, resolvedConfigFile)}. Install project dependencies first so Vite can load TypeScript config files. ${message}`);
    }
    const module = await import(pathToFileURL(resolvedConfigFile).href);
    return (module.default ?? module.config) as SvedocsConfig;
  }
}

async function findConfigFile(projectRoot: string): Promise<string | undefined> {
  for (const file of defaultConfigFiles) {
    const candidate = path.join(projectRoot, file);
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

async function loadConfigWithVite(projectRoot: string, configFile: string): Promise<SvedocsConfig> {
  const require = createRequire(path.join(projectRoot, 'package.json'));
  const vitePath = require.resolve('vite');
  const vite = await import(pathToFileURL(vitePath).href) as typeof import('vite');
  const loaded = await vite.loadConfigFromFile(
    {
      command: 'serve',
      mode: process.env.NODE_ENV ?? 'production'
    },
    configFile,
    projectRoot,
    'silent'
  );
  const config = loaded?.config;
  if (!config || typeof config !== 'object') {
    throw new Error(`No config object was exported from ${configFile}.`);
  }
  return config as SvedocsConfig;
}

function mergeSvedocsConfig(
  base: SvedocsConfig | undefined,
  overrides: SvedocsConfig | undefined
): SvedocsConfig | undefined {
  if (!base) return overrides;
  if (!overrides) return base;
  const site = mergeObject(base.site, overrides.site);
  const content = mergeObject(base.content, overrides.content);
  const build = mergeObject(base.build, overrides.build);
  const theme = mergeObject(base.theme, overrides.theme);
  const palette = mergeObject(base.theme?.palette, overrides.theme?.palette);
  const fonts = mergeObject(base.theme?.fonts, overrides.theme?.fonts);
  const codeTheme = mergeObject(
    typeof base.theme?.codeTheme === 'object' ? base.theme.codeTheme : undefined,
    typeof overrides.theme?.codeTheme === 'object' ? overrides.theme.codeTheme : undefined
  );
  const markdown = mergeObject(base.markdown, overrides.markdown);
  const seo = mergeObject(base.seo, overrides.seo);
  const source = mergeObject(base.source, overrides.source);
  const checks = mergeObject(base.checks, overrides.checks);
  const cloudflare = mergeObject(base.cloudflare, overrides.cloudflare);
  const aiSearch = mergeObject(base.cloudflare?.aiSearch, overrides.cloudflare?.aiSearch);
  const search = overrides.search ?? base.search;
  const ai = overrides.ai ?? base.ai;
  const i18n = overrides.i18n ?? base.i18n;
  return {
    ...base,
    ...overrides,
    ...(site ? { site } : {}),
    ...(content ? { content } : {}),
    ...(build ? { build } : {}),
    ...(theme ? {
      theme: {
        ...theme,
        ...(palette ? { palette } : {}),
        ...(fonts ? { fonts } : {}),
        ...(codeTheme ? { codeTheme } : {})
      }
    } : {}),
    ...(markdown ? { markdown } : {}),
    ...(seo ? { seo } : {}),
    ...(source ? { source } : {}),
    ...(checks ? { checks } : {}),
    ...(cloudflare ? { cloudflare: { ...cloudflare, ...(aiSearch ? { aiSearch } : {}) } } : {}),
    ...(search !== undefined ? { search } : {}),
    ...(ai !== undefined ? { ai } : {}),
    ...(i18n !== undefined ? { i18n } : {})
  };
}

function mergeObject<T extends object>(base: T | undefined, overrides: T | undefined): T | undefined {
  if (!base && !overrides) return undefined;
  return {
    ...(base ?? {}),
    ...(overrides ?? {})
  } as T;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
