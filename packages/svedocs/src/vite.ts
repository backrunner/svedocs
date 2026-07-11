import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { compile as compileMdsvex } from 'mdsvex';
import type { MdsvexOptions } from 'mdsvex';
import { loadConfigFromFile, type Plugin } from 'vite';
import type { SvedocsConfig } from './config.js';
import { loadSvedocsContent, resolveSvedocsHref, type SvedocsContentManifest, type SvedocsPage } from './core.js';
import { createSvedocsMdsvexOptions } from './svelte.js';
import type { SvedocsThemeComponentMap } from './theme/types.js';

export type SvedocsThemeComponentName = keyof SvedocsThemeComponentMap;
export type SvedocsThemeComponentImports = Partial<Record<SvedocsThemeComponentName, string>>;

export interface SvedocsVitePluginOptions {
  configFile?: string;
  config?: SvedocsConfig;
  components?: Record<string, string>;
  layouts?: Record<string, string>;
  theme?: {
    components?: SvedocsThemeComponentImports;
  };
}

const themeComponentNames = [
  'Root',
  'Layout',
  'Docs',
  'DocsShell',
  'Page',
  'PageShell',
  'Home',
  'Error',
  'Brand',
  'TopNav',
  'Header',
  'Navbar',
  'MobileNav',
  'SocialNav',
  'Sidebar',
  'Article',
  'Toc',
  'Search',
  'AskAi',
  'Footer',
  'FooterLinks',
  'ThemeToggle',
  'PageTools',
  'RenderError'
] as const satisfies readonly SvedocsThemeComponentName[];
const themeComponentNameSet = new Set<string>(themeComponentNames);

const virtualModules = new Set([
  'virtual:svedocs/config',
  'virtual:svedocs/pages',
  'virtual:svedocs/page-index',
  'virtual:svedocs/page-loaders',
  'virtual:svedocs/tree',
  'virtual:svedocs/search',
  'virtual:svedocs/search-loader',
  'virtual:svedocs/components',
  'virtual:svedocs/layouts',
  'virtual:svedocs/theme-components',
  'virtual:svedocs/manifest'
]);

const componentVirtualPrefix = 'virtual:svedocs/component/';
const pageVirtualPrefix = 'virtual:svedocs/page/';
const defaultConfigFiles = [
  'svedocs.config.ts',
  'svedocs.config.mts',
  'svedocs.config.js',
  'svedocs.config.mjs'
];

export function svedocs(options: SvedocsVitePluginOptions = {}): Plugin {
  let root = process.cwd();
  let manifest: SvedocsContentManifest | undefined;
  let resolvedConfig: SvedocsConfig | undefined;
  let resolvedConfigFile: string | undefined;
  const themeComponentImports = normalizeThemeComponentImports(options.theme?.components);

  async function refresh() {
    const loaded = await loadPluginConfig(root, options);
    resolvedConfig = loaded.config;
    resolvedConfigFile = loaded.configFile;
    manifest = await loadSvedocsContent(createContentOptions(root, resolvedConfig));
  }

  return {
    name: 'svedocs',
    async configResolved(config) {
      root = config.root;
      await refresh();
    },
    async buildStart() {
      await refresh();
      if (resolvedConfigFile) this.addWatchFile(resolvedConfigFile);
      for (const page of manifest?.pages ?? []) {
        this.addWatchFile(page.sourcePath);
      }
    },
    config() {
      return {
        define: {
          __SVEDOCS_CONFIG_FILE__: JSON.stringify(options.configFile ?? process.env.SVEDOCS_CONFIG_FILE ?? 'svedocs.config.ts')
        }
      };
    },
    resolveId(id) {
      if (id.startsWith(componentVirtualPrefix)) return `\0${id}`;
      if (id.startsWith(pageVirtualPrefix)) return `\0${id}`;
      if (virtualModules.has(id)) return `\0${id}`;
      return undefined;
    },
    async load(id) {
      if (id.startsWith(`\0${pageVirtualPrefix}`)) {
        if (!manifest) await refresh();
        const data = manifest ?? (await loadSvedocsContent(createContentOptions(root, options.config)));
        const code = loadPageDataModule(id, data.pages);
        return {
          code,
          map: {
            version: 3,
            sources: [id],
            sourcesContent: [code],
            names: [],
            mappings: ''
          }
        };
      }
      if (id.startsWith(`\0${componentVirtualPrefix}`)) {
        if (!manifest) await refresh();
        const data = manifest ?? (await loadSvedocsContent(createContentOptions(root, options.config)));
        const code = await loadPageComponent(root, id, data.pages, options.components ?? {}, resolvedConfig, data.config);
        return {
          code,
          map: {
            version: 3,
            sources: [id],
            sourcesContent: [code],
            names: [],
            mappings: ''
          }
        };
      }
      if (!id.startsWith('\0virtual:svedocs/')) return undefined;
      if (!manifest) await refresh();
      const data = manifest ?? (await loadSvedocsContent(createContentOptions(root, options.config)));
      const key = id.replace('\0virtual:svedocs/', '');
      if (key === 'config') return `export default ${JSON.stringify(data.config)};`;
      if (key === 'pages') return `export default ${JSON.stringify(data.pages)};`;
      if (key === 'page-index') return `export default ${JSON.stringify(createPageIndex(data.pages))};`;
      if (key === 'page-loaders') return createPageLoadersModule(data.pages);
      if (key === 'tree') return `export default ${JSON.stringify(data.tree)};`;
      if (key === 'search') return `export default ${JSON.stringify(data.search)};`;
      if (key === 'search-loader') return `export default () => import('virtual:svedocs/search').then((module) => module.default);`;
      if (key === 'components') return createComponentsModule(data.pages);
      if (key === 'layouts') return createNamedImportModule(options.layouts ?? {});
      if (key === 'theme-components') return createNamedImportModule(themeComponentImports);
      if (key === 'manifest') return `export default ${JSON.stringify(data)};`;
      return undefined;
    },
    async handleHotUpdate(ctx) {
      if (/\.(md|mdx|svx)$/.test(ctx.file) || ctx.file === resolvedConfigFile || /svedocs\.config\.[cm]?[jt]s$/.test(ctx.file)) {
        await refresh();
        const moduleIds = new Set<string>(Array.from(virtualModules, (id) => `\0${id}`));
        for (const page of manifest?.pages ?? []) {
          moduleIds.add(`\0${pageVirtualPrefix}${encodeURIComponent(page.id)}.js`);
          moduleIds.add(`\0${componentVirtualPrefix}${encodeURIComponent(page.id)}.svelte`);
        }
        for (const id of ctx.server.moduleGraph.idToModuleMap.keys()) {
          if (id.startsWith(`\0${pageVirtualPrefix}`) || id.startsWith(`\0${componentVirtualPrefix}`)) {
            moduleIds.add(id);
          }
        }
        const modules = Array.from(moduleIds)
          .map((id) => ctx.server.moduleGraph.getModuleById(id))
          .filter((module) => module !== undefined);
        return modules;
      }
      return undefined;
    }
  };
}

function createContentOptions(root: string, config: SvedocsConfig | undefined) {
  const buildConfig = applyBuildModeOverride(config);
  return buildConfig ? { projectRoot: root, config: buildConfig } : { projectRoot: root };
}

function applyBuildModeOverride(config: SvedocsConfig | undefined): SvedocsConfig | undefined {
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

async function loadPluginConfig(
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

async function findConfigFile(root: string): Promise<string | undefined> {
  for (const file of defaultConfigFiles) {
    const candidate = path.join(root, file);
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function createComponentsModule(pages: SvedocsPage[]): string {
  const componentPages = pages.filter((page) => /\.(mdx|svx)$/.test(page.sourcePath));
  const imports = componentPages
    .map((page, index) => `import C${index} from '${componentVirtualPrefix}${encodeURIComponent(page.id)}.svelte';`)
    .join('\n');
  const entries = componentPages
    .map((page, index) => `${JSON.stringify(page.id)}: C${index}`)
    .join(',\n  ');
  return `${imports}\nexport default {\n  ${entries}\n};`;
}

function createPageIndex(pages: SvedocsPage[]): SvedocsPage[] {
  return pages.map((page) => ({
    ...page,
    html: '',
    plainText: '',
    headings: [],
    links: [],
    codeBlocks: [],
    search: []
  }));
}

function createPageLoadersModule(pages: SvedocsPage[]): string {
  const entries = pages
    .map((page) => `${JSON.stringify(page.id)}: () => import('${pageVirtualPrefix}${encodeURIComponent(page.id)}.js')`)
    .join(',\n  ');
  return `export default {\n  ${entries}\n};`;
}

function loadPageDataModule(id: string, pages: SvedocsPage[]): string {
  const pageId = decodeURIComponent(id.slice(`\0${pageVirtualPrefix}`.length).replace(/\.js$/, ''));
  const page = pages.find((item) => item.id === pageId);
  return `export default ${JSON.stringify(page)};`;
}

function createNamedImportModule(entries: Record<string, string | undefined>): string {
  const resolvedEntries = Object.entries(entries)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0);
  const imports = resolvedEntries
    .map(([, specifier], index) => `import C${index} from ${JSON.stringify(specifier)};`)
    .join('\n');
  const exports = resolvedEntries
    .map(([name], index) => `${JSON.stringify(name)}: C${index}`)
    .join(',\n  ');
  return `${imports}\nexport default {\n  ${exports}\n};`;
}

function normalizeThemeComponentImports(entries: SvedocsThemeComponentImports | undefined): SvedocsThemeComponentImports {
  const normalized: SvedocsThemeComponentImports = {};
  const unknown: string[] = [];
  const invalid: string[] = [];

  for (const [name, specifier] of Object.entries(entries ?? {})) {
    if (!themeComponentNameSet.has(name)) {
      unknown.push(name);
      continue;
    }
    if (typeof specifier !== 'string' || specifier.trim().length === 0) {
      invalid.push(name);
      continue;
    }
    normalized[name as SvedocsThemeComponentName] = specifier.trim();
  }

  if (unknown.length > 0) {
    const label = unknown.length === 1 ? 'component key' : 'component keys';
    throw new Error(
      `Unknown svedocs theme ${label}: ${unknown.map((name) => JSON.stringify(name)).join(', ')}. ` +
      `Supported keys are: ${themeComponentNames.join(', ')}.`
    );
  }
  if (invalid.length > 0) {
    const label = invalid.length === 1 ? 'component import' : 'component imports';
    throw new Error(`Invalid svedocs theme ${label}: ${invalid.join(', ')} must be non-empty import specifiers.`);
  }

  return normalized;
}

async function loadPageComponent(
  root: string,
  id: string,
  pages: SvedocsPage[],
  components: Record<string, string>,
  rawConfig: SvedocsConfig | undefined,
  manifestConfig: SvedocsContentManifest['config']
): Promise<string> {
  const pageId = decodeURIComponent(id.slice(`\0${componentVirtualPrefix}`.length).replace(/\.svelte$/, ''));
  const page = pages.find((item) => item.id === pageId);
  if (!page) return '<script>export const prerender = true;</script>';
  const raw = await readFile(path.join(root, page.sourcePath), 'utf8');
  const parsed = matter(raw);
  const source = injectSvedocsComponentImports(stripFirstTitleHeading(parsed.content), components);
  const headingAnchorLabel = manifestConfig.i18n.messages[
    page.locale ?? manifestConfig.i18n.defaultLocale ?? 'en'
  ]?.['heading.anchor'];
  try {
    const compiled = await compileMdsvex(source, {
      filename: page.sourcePath,
      ...createSvedocsMdsvexOptions(
        source,
        createMdsvexOptionsFromConfig(rawConfig),
        {
          codeThemes: {
            light: manifestConfig.theme.codeTheme.light,
            dark: manifestConfig.theme.codeTheme.dark
          },
          codeCopyButton: manifestConfig.theme.code.copyButton,
          ...(headingAnchorLabel ? { headingAnchorLabel } : {}),
          resolveHref: (href) => resolveSvedocsHref({
            href,
            pages,
            config: manifestConfig,
            page
          }).href,
          ...(rawConfig?.markdown?.shiki?.transformers ? { shikiTransformers: rawConfig.markdown.shiki.transformers } : {})
        }
      )
    });
    const result = await compiled;
    return stripInlineSourceMap(result?.code ?? '<script>export const prerender = true;</script>');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile ${page.sourcePath} as Svelte-compatible MDX: ${message}`);
  }
}

function createMdsvexOptionsFromConfig(config: SvedocsConfig | undefined): MdsvexOptions {
  const options: MdsvexOptions = {};
  if (config?.markdown?.remarkPlugins) {
    options.remarkPlugins = config.markdown.remarkPlugins as NonNullable<MdsvexOptions['remarkPlugins']>;
  }
  if (config?.markdown?.rehypePlugins) {
    options.rehypePlugins = config.markdown.rehypePlugins as NonNullable<MdsvexOptions['rehypePlugins']>;
  }
  return options;
}

function stripFirstTitleHeading(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const index = lines.findIndex((line) => /^#\s+/.test(line.trim()));
  if (index >= 0) lines.splice(index, 1);
  return lines.join('\n').trim();
}

function injectSvedocsComponentImports(source: string, components: Record<string, string>): string {
  const imports = Object.entries(components)
    .map(([name, specifier]) => `import ${name} from ${JSON.stringify(specifier)};`)
    .join('\n');
  if (!imports) return source;
  const instanceScript = /<script(\s(?![^>]*\bcontext=["']module["'])[^>]*)?>/.exec(source);
  if (!instanceScript || instanceScript.index === undefined) {
    return `<script>\n${imports}\n</script>\n\n${source}`;
  }
  const insertAt = instanceScript.index + instanceScript[0].length;
  return `${source.slice(0, insertAt)}\n${imports}${source.slice(insertAt)}`;
}

function stripInlineSourceMap(code: string): string {
  return code.replace(/\n?\/\/# sourceMappingURL=data:application\/json;base64,[A-Za-z0-9+/=]+$/m, '');
}
