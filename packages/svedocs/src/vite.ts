import { createServerConfigModule, createContentOptions, loadPluginConfig } from './vite/config.js';
import { normalizeThemeComponentImports, loadPageComponent } from './vite/components.js';
import { componentVirtualPrefix, pageVirtualPrefix, createPageComponentImports, createNamedLoaderModule, createPageIndex, stripPageMarkdown, createMarkdownMap, createPageLoadersModule, loadPageDataModule, createNamedImportModule } from './vite/modules.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';
import { createContentSession } from './core/content-cache.js';
import { createRefreshQueue } from './vite/refresh.js';
import type { SvedocsConfig } from './config.js';
import type { SvedocsContentManifest } from './core/types.js';
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

  const session = createContentSession();
  const generated = new Map<string, string>();
  const componentCache = new Map<string, { version: number; code: Promise<string> }>();
  const componentDependencies = new Map<string, Set<string>>();
  const svelteDependencies = new Map<string, Set<string>>();
  let outputBaseline: Map<string, string> | undefined;
  let dirty = true;
  let configDirty = true;
  let server: ViteDevServer | undefined;
  const refresh = createRefreshQueue(async (changed) => {
    if (configDirty) {
      configDirty = false;
      const loaded = await loadPluginConfig(root, options).catch((error) => { configDirty = true; throw error; });
      resolvedConfig = loaded.config;
      resolvedConfigFile = loaded.configFile;
      session.invalidate();
    }
    const next = await session.load(createContentOptions(root, resolvedConfig), changed);
    manifest = next;
    dirty = false;
    for (const [id, dependencies] of componentDependencies) {
      if ([...dependencies].some((file) => changed.has(file))) componentCache.delete(id);
    }
    const ids = new Set(next.pages.map((page) => page.id));
    for (const id of componentCache.keys()) {
      const pageId = decodeURIComponent(id.slice(`\0${componentVirtualPrefix}`.length).replace(/\.svelte$/, ''));
      if (!ids.has(pageId)) { componentCache.delete(id); componentDependencies.delete(id); }
    }
    server?.watcher.add([...session.dependencies(), ...next.pages.map((page) => path.resolve(root, page.sourcePath))]);
  });

  function markChanged(file: string) {
    outputBaseline ??= new Map(generated);
    dirty = true;
    if (file === resolvedConfigFile || /svedocs\.config\.[cm]?[jt]s$/.test(file)) configDirty = true;
  }

  function relevant(file: string) {
    return /\.(md|mdx|svx|png|jpe?g|webp|avif|gif|tiff?|svg)$/.test(file)
      || file === resolvedConfigFile || /svedocs\.config\.[cm]?[jt]s$/.test(file);
  }

  let pendingUpdate: Promise<Set<string>> | undefined;
  const updateFiles = new Set<string>();
  function changedModules(file: string): Promise<Set<string>> {
    markChanged(file);
    refresh.mark(file);
    updateFiles.add(file);
    if (!pendingUpdate) {
      // Capture before awaiting: concurrent loads must not erase the old output baseline.
      const before = outputBaseline ?? new Map(generated);
      pendingUpdate = (async () => {
        let changedIds = new Set<string>();
        const affectedSvelte = new Set<string>();
        let nextOutput = new Map<string, string>();
        do {
          const files = new Set(updateFiles);
          updateFiles.clear();
          await refresh();
          changedIds = new Set();
          nextOutput = new Map();
          for (const [id, previous] of before) {
            const next = await renderModule(id);
            if (next !== previous) changedIds.add(id);
            if (next !== undefined) nextOutput.set(id, next);
          }
          for (const [id, dependencies] of svelteDependencies) {
            if ([...dependencies].some((dependency) => files.has(dependency))) affectedSvelte.add(id);
          }
        } while (updateFiles.size);
        for (const [id, code] of nextOutput) generated.set(id, code);
        return new Set([...changedIds, ...affectedSvelte]);
      })().finally(() => { pendingUpdate = undefined; outputBaseline = undefined; });
    }
    return pendingUpdate;
  }

  return {
    name: 'svedocs',
    async configResolved(config) {
      root = config.root;
      configDirty = true;
      await refresh();
    },
    async buildStart() {
      if (!manifest || dirty || refresh.isPending()) await refresh();
      if (resolvedConfigFile) this.addWatchFile(resolvedConfigFile);
      for (const page of manifest?.pages ?? []) this.addWatchFile(path.resolve(root, page.sourcePath));
      for (const file of session.dependencies()) this.addWatchFile(file);
    },
    async transform(code, id) {
      if (!manifest || id.startsWith('\0') || id.includes('/node_modules/') || !/\.svelte(?:\?|$)/.test(id)) return undefined;
      const sourcePath = path.relative(root, id.split('?')[0] ?? id);
      const dependencies = new Set<string>();
      const transformed = await transformSvedocsImageComponents(code, {
        ...manifest.config.images,
        projectRoot: root,
        sourcePath,
        onDependency: (file) => { dependencies.add(file); this.addWatchFile(file); }
      });
      svelteDependencies.set(id, dependencies);
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
      const code = await renderModule(id);
      if (code === undefined) return undefined;
      generated.set(id, code);
      if (!server) {
        if (resolvedConfigFile) this.addWatchFile?.(resolvedConfigFile);
        for (const page of manifest?.pages ?? []) this.addWatchFile?.(path.resolve(root, page.sourcePath));
        for (const file of session.dependencies()) this.addWatchFile?.(file);
        for (const file of componentDependencies.get(id) ?? []) this.addWatchFile?.(file);
      }
      if (virtualModules.has(id.slice(1))) return code;
      return { code, map: { version: 3, sources: [id], sourcesContent: [code], names: [], mappings: '' } };
    },
    configureServer(devServer) {
      server = devServer;
      // SvelteKit narrows fs.allow to the app; workspace-linked Workers live in the package.
      devServer.config.server.fs.allow.push(fileURLToPath(new URL('./search/', import.meta.url)));
      // Vite's legacy hot-update hook only covers changes, so handle additions/removals too.
      const onStructure = (file: string) => {
        if (!relevant(file)) return;
        void changedModules(file).then((ids) => {
          for (const id of ids) {
            const module = devServer.moduleGraph.getModuleById(id);
            if (module) devServer.moduleGraph.invalidateModule(module);
          }
          if (ids.size) devServer.ws.send({ type: 'full-reload' });
        }).catch((error) => devServer.config.logger.error(String(error)));
      };
      devServer.watcher.on('add', onStructure);
      devServer.watcher.on('unlink', onStructure);
      devServer.httpServer?.once('close', () => {
        devServer.watcher.off('add', onStructure);
        devServer.watcher.off('unlink', onStructure);
      });
    },
    async handleHotUpdate(ctx) {
      if (!relevant(ctx.file)) return undefined;
      const ids = await changedModules(ctx.file);
      // Svelte's post hook transforms affected components before Vite's final HMR pass.
      // These virtual modules are not associated with ctx.file, so invalidate them now.
      for (const id of ids) {
        const module = ctx.server.moduleGraph.getModuleById(id);
        if (module) ctx.server.moduleGraph.invalidateModule(module);
      }
      if ([...ids].some((id) => id.startsWith('\0virtual:svedocs/'))) {
        // Universal page data and the content component must switch snapshots together.
        ctx.server.ws.send({ type: 'full-reload' });
        return [];
      }
      return [...new Set([...ctx.modules.filter((module) => !module.id?.startsWith('\0virtual:svedocs/') || ids.has(module.id)), ...[...ids].flatMap((id) => {
        const module = ctx.server.moduleGraph.getModuleById(id);
        return module ? [module] : [];
      })])];
    },
    watchChange(id) {
      if (!relevant(id)) return;
      markChanged(id);
      refresh.mark(id);
    }
  };

  async function renderModule(id: string): Promise<string | undefined> {
    if (id.startsWith(`\0${pageVirtualPrefix}`)) {
      if (!manifest || dirty || refresh.isPending()) await refresh();
      const data = manifest!;
      const code = loadPageDataModule(id, data.pages);
      return code;
    }
    if (id.startsWith(`\0${componentVirtualPrefix}`)) {
      if (!manifest || dirty || refresh.isPending()) await refresh();
      const data = manifest!;
      const pageId = decodeURIComponent(id.slice(`\0${componentVirtualPrefix}`.length).replace(/\.svelte$/, ''));
      const version = session.version(pageId);
      let cached = componentCache.get(id);
      if (!cached || cached.version !== version) {
        const dependencies = new Set<string>();
        const code = loadPageComponent(root, id, data.pages, options.components ?? {}, resolvedConfig, data.config, (file) => dependencies.add(file));
        cached = { version, code };
        componentCache.set(id, cached);
        componentDependencies.set(id, dependencies);
        void code.then(() => server?.watcher.add([...dependencies])).catch(() => { if (componentCache.get(id)?.code === code) componentCache.delete(id); });
      }
      const code = await cached.code;
      if (dirty || refresh.isPending() || session.version(pageId) !== version || componentCache.get(id) !== cached) return renderModule(id);
      return code;
    }
    if (!id.startsWith('\0virtual:svedocs/')) return undefined;
    if (!manifest || dirty || refresh.isPending()) await refresh();
    const data = manifest!;
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
  }
}
