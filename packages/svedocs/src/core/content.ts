import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { validateSvedocsConfig, type SvedocsConfig } from '../config.js';
import { inferKind, createRouteInfo, assignUniquePageIds } from './discovery.js';
import { isResolvedConfig, resolveSvedocsConfig } from './config.js';
import { checkSvedocsContent } from './checks.js';
import { loadContentFile, createMarkdownCompileOptions } from './content-page.js';
import { createPageTree, wirePrevNext } from './navigation.js';
import type { SvedocsRouteTarget } from './routes.js';
import { createSearchRecords } from './search.js';
import { optimizeSvedocsThemeImages } from '../mdx/images.js';
import type { SvedocsContentManifest, SvedocsResolvedConfig } from './types.js';
import { slugFrontmatter } from './utils.js';
import type { ContentCache, CachedContentPage } from './content-cache.js';

export interface ContentOptions {
  projectRoot?: string;
  config?: SvedocsConfig | SvedocsResolvedConfig;
}

export function loadSvedocsContent(options: ContentOptions = {}): Promise<SvedocsContentManifest> {
  return loadContentSnapshot(options);
}

/** Only the Vite session supplies a cache; standalone content loads stay fresh. */
export async function loadContentSnapshot(options: ContentOptions, cache?: ContentCache, changed = new Set<string>()): Promise<SvedocsContentManifest> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const rawConfig = isResolvedConfig(options.config) ? undefined : options.config;
  let config = isResolvedConfig(options.config)
    ? options.config
    : resolveSvedocsConfig(validateSvedocsConfig(options.config ?? {}));
  const themeDependencies = new Set<string>();
  config = await optimizeSvedocsThemeImages(config, projectRoot, (file) => themeDependencies.add(file));
  const markdownOptions = createMarkdownCompileOptions(rawConfig, config);
  const files = await fg(config.content.include, {
    cwd: projectRoot,
    absolute: false,
    ignore: config.content.exclude,
    onlyFiles: true
  });
  const entries = assignUniquePageIds(await Promise.all(files
    .filter((file) => isContentFile(file))
    .sort()
    .map(async (file) => {
      const kind = inferKind(file, config);
      const [raw, stats] = await Promise.all([readFile(path.join(projectRoot, file), 'utf8'), stat(path.join(projectRoot, file))]);
      return { file, kind, raw, stamp: stats.mtime.toISOString(), route: createRouteInfo(file, kind, config, slugFrontmatter(matter(raw).data.slug)) };
    })));
  const routeTargets: SvedocsRouteTarget[] = entries.map(({ file, kind, route }) => ({
    kind,
    sourcePath: file,
    routePath: route.routePath,
    scopePath: route.scopePath,
    ...(route.locale ? { locale: route.locale } : {})
  }));
  const contextKey = JSON.stringify([projectRoot, config, entries.map(({ id, route, kind }) => [id, route, kind])]);
  const customPlugins = Boolean(rawConfig?.markdown?.remarkPlugins?.length
    || rawConfig?.markdown?.rehypePlugins?.length || rawConfig?.markdown?.shiki?.transformers?.length);
  const reusable = cache && !customPlugins && cache.contextKey === contextKey;
  const nextPages = new Map<string, CachedContentPage>();
  const pages = await Promise.all(entries.map(async (entry) => {
    const previous = reusable ? cache.pages.get(entry.file) : undefined;
    if (previous && previous.raw === entry.raw && previous.page.lastUpdated === entry.stamp
      && ![...previous.dependencies].some((file) => changed.has(file))) {
      nextPages.set(entry.file, previous);
      return { ...previous.page };
    }
    const dependencies = new Set<string>();
    const page = await loadContentFile(projectRoot, entry, routeTargets, config, markdownOptions, (file) => dependencies.add(file));
    nextPages.set(entry.file, { raw: entry.raw, page, dependencies, version: cache ? ++cache.revision : 0 });
    // Navigation assembly mutates only the snapshot, never cached pages.
    return { ...page };
  }));
  const sorted = pages.sort((a, b) => a.routePath.localeCompare(b.routePath));
  const tree = createPageTree(sorted);
  wirePrevNext(sorted, tree);
  const manifest: SvedocsContentManifest = {
    config,
    pages: sorted,
    tree,
    search: createSearchRecords(sorted),
    issues: []
  };
  manifest.issues = await checkSvedocsContent(manifest, projectRoot);
  if (cache) {
    cache.contextKey = contextKey;
    cache.pages = nextPages;
    cache.themeDependencies = themeDependencies;
  }
  return manifest;
}

function isContentFile(file: string): boolean {
  return /\.(md|mdx|svx)$/.test(file);
}
