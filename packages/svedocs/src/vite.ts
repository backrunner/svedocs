import { createServerConfigModule, createContentOptions, loadPluginConfig } from './vite/config.js';
import { normalizeThemeComponentImports, loadPageComponent } from './vite/components.js';
import { componentVirtualPrefix, pageVirtualPrefix, createPageComponentImports, createNamedLoaderModule, createPageIndex, stripPageMarkdown, createMarkdownMap, createPageLoadersModule, loadPageDataModule, createNamedImportModule } from './vite/modules.js';
import path from 'node:path';
import type { Plugin } from 'vite';
import type { SvedocsConfig } from './config.js';
import { loadSvedocsContent, type SvedocsContentManifest, type SvedocsPage } from './core.js';
import { transformSvedocsImageComponents } from './mdx/images.js';
import type { SvedocsThemeComponentMap } from './theme/types.js';

export type SvedocsThemeComponentName = keyof SvedocsThemeComponentMap;
export type SvedocsThemeComponentImports = Partial<Record<SvedocsThemeComponentName, string>>;

export interface SvedocsVitePluginOptions {
  configFile?: string;
  config?: SvedocsConfig;
  components?: Record<string, string>;
  layouts?: Record<string, string>;
  /** Replace the content of an existing route with a Svelte component. */
  pageComponents?: Record<string, string>;
  theme?: {
    components?: SvedocsThemeComponentImports;
  };
}

const virtualModules = new Set([
  'virtual:svedocs/config',
  'virtual:svedocs/server-config',
  'virtual:svedocs/pages',
  'virtual:svedocs/page-index',
  'virtual:svedocs/page-loaders',
  'virtual:svedocs/tree',
  'virtual:svedocs/search',
  'virtual:svedocs/search-loader',
  'virtual:svedocs/markdown',
  'virtual:svedocs/components',
  'virtual:svedocs/component-loaders',
  'virtual:svedocs/layouts',
  'virtual:svedocs/layout-loaders',
  'virtual:svedocs/theme-components',
  'virtual:svedocs/manifest'
]);

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
      if (!manifest) await refresh();
      if (resolvedConfigFile) this.addWatchFile(resolvedConfigFile);
      for (const page of manifest?.pages ?? []) {
        this.addWatchFile(path.resolve(root, page.sourcePath));
      }
    },
    async transform(code, id) {
      if (!manifest || id.startsWith('\0') || id.includes('/node_modules/') || !/\.svelte(?:\?|$)/.test(id)) return undefined;
      const sourcePath = path.relative(root, id.split('?')[0] ?? id);
      const transformed = await transformSvedocsImageComponents(code, {
        ...manifest.config.images,
        projectRoot: root,
        sourcePath
      });
      return transformed === code ? undefined : { code: transformed, map: null };
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
      if (key === 'server-config') return createServerConfigModule(data.config, resolvedConfigFile);
      if (key === 'pages') return `export default ${JSON.stringify(stripPageMarkdown(data.pages))};`;
      if (key === 'page-index') return `export default ${JSON.stringify(createPageIndex(data.pages))};`;
      if (key === 'page-loaders') return createPageLoadersModule(data.pages);
      if (key === 'tree') return `export default ${JSON.stringify(data.tree)};`;
      if (key === 'search') return `export default ${JSON.stringify(data.search)};`;
      if (key === 'search-loader') return `export default () => import('virtual:svedocs/search').then((module) => module.default);`;
      if (key === 'markdown') return `export default ${JSON.stringify(createMarkdownMap(data.pages))};`;
      if (key === 'components') return createNamedImportModule(createPageComponentImports(data.pages, options.pageComponents));
      if (key === 'component-loaders') return createNamedLoaderModule(createPageComponentImports(data.pages, options.pageComponents));
      if (key === 'layouts') return createNamedImportModule(options.layouts ?? {});
      if (key === 'layout-loaders') return createNamedLoaderModule(options.layouts ?? {});
      if (key === 'theme-components') return createNamedImportModule(themeComponentImports);
      if (key === 'manifest') return `export default ${JSON.stringify({ ...data, pages: stripPageMarkdown(data.pages) })};`;
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
    },
    watchChange() {
      // Rollup watch builds must refresh after the initial configResolved load.
      manifest = undefined;
    }
  };
}
