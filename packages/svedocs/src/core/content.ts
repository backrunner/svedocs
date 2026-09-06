import { normalizeSeoHead } from './frontmatter.js';
import { inferKind, createRouteInfo, assignUniquePageIds, type SvedocsRouteInfo } from './discovery.js';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { validateSvedocsConfig, type SvedocsConfig } from '../config.js';
import { prepareMarkdownTitle } from '../mdx/ast.js';
import { compileMarkdown, type CompileMarkdownOptions } from '../mdx/compile.js';
import { checkSvedocsContent } from './checks.js';
import { defaultSvedocsMessages, isResolvedConfig, resolveSvedocsConfig } from './config.js';
import { extractMarkdownLinks } from './links.js';
import { createPageTree, wirePrevNext } from './navigation.js';
import { resolveSvedocsHref, type SvedocsRouteTarget } from './routes.js';
import { createPageSearchRecords, createSearchRecords } from './search.js';
import { optimizeSvedocsThemeImages } from '../mdx/images.js';
import type { SvedocsContentManifest, SvedocsPage, SvedocsResolvedConfig } from './types.js';
import {
  booleanFrontmatter,
  formatRoutePathForBuildMode,
  normalizePath,
  numberFrontmatter,
  slugFrontmatter,
  stringArrayFrontmatter,
  stringFrontmatter,
  titleFromSegment
} from './utils.js';

export async function loadSvedocsContent(options: {
  projectRoot?: string;
  config?: SvedocsConfig | SvedocsResolvedConfig;
} = {}): Promise<SvedocsContentManifest> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const rawConfig = isResolvedConfig(options.config) ? undefined : options.config;
  let config = isResolvedConfig(options.config)
    ? options.config
    : resolveSvedocsConfig(validateSvedocsConfig(options.config ?? {}));
  config = await optimizeSvedocsThemeImages(config, projectRoot);
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
      const raw = await readFile(path.join(projectRoot, file), 'utf8');
      return { file, kind, raw, route: createRouteInfo(file, kind, config, slugFrontmatter(matter(raw).data.slug)) };
    })));
  const routeTargets: SvedocsRouteTarget[] = entries.map(({ file, kind, route }) => ({
    kind,
    sourcePath: file,
    routePath: route.routePath,
    scopePath: route.scopePath,
    ...(route.locale ? { locale: route.locale } : {})
  }));
  const pages = await Promise.all(entries.map((entry) => (
    loadContentFile(projectRoot, entry, routeTargets, config, markdownOptions)
  )));
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
  return manifest;
}

function isContentFile(file: string): boolean {
  return /\.(md|mdx|svx)$/.test(file);
}

async function loadContentFile(
  projectRoot: string,
  entry: { file: string; id: string; kind: 'doc' | 'page'; raw: string; route: SvedocsRouteInfo },
  routeTargets: SvedocsRouteTarget[],
  config: SvedocsResolvedConfig,
  markdownOptions: CompileMarkdownOptions
): Promise<SvedocsPage> {
  const { file, id, kind, raw, route } = entry;
  const sourcePath = path.join(projectRoot, file);
  const fileStats = await stat(sourcePath);
  const parsed = matter(raw);
  const markdown = parsed.content.trim();
  const frontmatter = parsed.data as Record<string, unknown>;
  const prepared = prepareMarkdownTitle(markdown, stringFrontmatter(frontmatter.title));
  const renderMarkdown = prepared.markdown;
  const routePath = route.routePath;
  const currentRoute: SvedocsRouteTarget = {
    kind,
    sourcePath: file,
    routePath,
    scopePath: route.scopePath,
    ...(route.locale ? { locale: route.locale } : {})
  };
  const compiled = await compileMarkdown(renderMarkdown, {
    ...markdownOptions,
    imageOptimization: {
      ...config.images,
      projectRoot,
      sourcePath: file,
      skip: shouldSkipPageImages(frontmatter)
    },
    messages: createMarkdownMessages(config, route.locale),
    resolveHref: (href) => resolveSvedocsHref({
      href,
      pages: routeTargets,
      config,
      page: currentRoute
    }).href
  });
  const title = prepared.title ?? compiled.title ?? titleFromRoute(routePath);
  const navTitle = stringFrontmatter(frontmatter.navTitle) ?? stringFrontmatter(frontmatter.nav_title);
  const description = stringFrontmatter(frontmatter.description);
  const order = numberFrontmatter(frontmatter.order);
  const hidden = booleanFrontmatter(frontmatter.hidden);
  const collapsed = booleanFrontmatter(frontmatter.collapsed);
  const section = booleanFrontmatter(frontmatter.section);
  const icon = stringFrontmatter(frontmatter.icon);
  const keywords = stringArrayFrontmatter(frontmatter.keywords);
  const type = stringFrontmatter(frontmatter.type) ?? stringFrontmatter(frontmatter.ogType) ?? stringFrontmatter(frontmatter.og_type);
  const author = stringFrontmatter(frontmatter.author) ?? config.seo.defaultAuthor;
  const robots = stringFrontmatter(frontmatter.robots);
  const head = normalizeSeoHead(frontmatter.head);
  const publishedTime = dateFrontmatter(frontmatter.publishedTime)
    ?? dateFrontmatter(frontmatter.published_time)
    ?? dateFrontmatter(frontmatter.published)
    ?? dateFrontmatter(frontmatter.date);
  const updatedTime = dateFrontmatter(frontmatter.updatedTime)
    ?? dateFrontmatter(frontmatter.updated_time)
    ?? dateFrontmatter(frontmatter.updated);
  const canonical = stringFrontmatter(frontmatter.canonical) ?? createPageCanonicalUrl(config, routePath);
  const image = stringFrontmatter(frontmatter.image);
  const page: SvedocsPage = {
    id,
    sourcePath: file,
    routePath,
    scopePath: route.scopePath,
    slug: route.slug,
    ...(route.locale ? { locale: route.locale } : {}),
    kind,
    title,
    ...(navTitle ? { navTitle } : {}),
    ...(description ? { description } : {}),
    ...(typeof order === 'number' ? { order } : {}),
    ...(hidden === true ? { hidden } : {}),
    ...(typeof collapsed === 'boolean' ? { collapsed } : {}),
    ...(section === true ? { section } : {}),
    ...(icon ? { icon } : {}),
    html: compiled.html,
    plainText: compiled.plainText,
    markdown: renderMarkdown,
    headings: compiled.headings,
    links: extractMarkdownLinks(markdown),
    codeBlocks: compiled.codeBlocks,
    frontmatter,
    seo: {
      title,
      ...(description ? { description } : {}),
      ...(canonical ? { canonical } : {}),
      ...(image ? { image } : {}),
      ...(keywords.length > 0 ? { keywords } : {}),
      ...(type ? { type } : {}),
      ...(author ? { author } : {}),
      ...(publishedTime ? { publishedTime } : {}),
      ...(updatedTime ? { updatedTime } : {}),
      ...(robots ? { robots } : {}),
      ...(head ? { head } : {})
    },
    search: [],
    lastUpdated: fileStats.mtime.toISOString(),
    ...(config.source.editBaseUrl ? { editUrl: createEditUrl(config.source.editBaseUrl, file) } : {})
  };
  page.search = createPageSearchRecords(page, renderMarkdown);
  return page;
}

function shouldSkipPageImages(frontmatter: Record<string, unknown>): boolean {
  return frontmatter.imageCompression === false
    || frontmatter.imageOptimization === false
    || frontmatter.images === false
    || frontmatter.noImageCompression === true;
}

function createMarkdownCompileOptions(
  rawConfig: SvedocsConfig | undefined,
  resolvedConfig: SvedocsResolvedConfig
): CompileMarkdownOptions {
  return {
    ...(rawConfig?.markdown?.remarkPlugins ? { remarkPlugins: rawConfig.markdown.remarkPlugins } : {}),
    ...(rawConfig?.markdown?.rehypePlugins ? { rehypePlugins: rawConfig.markdown.rehypePlugins } : {}),
    ...(rawConfig?.markdown?.shiki?.transformers ? { shikiTransformers: rawConfig.markdown.shiki.transformers } : {}),
    ...(resolvedConfig.theme.defaultMode === 'system'
      ? {
          codeThemes: {
            light: resolvedConfig.theme.codeTheme.light,
            dark: resolvedConfig.theme.codeTheme.dark
          }
        }
      : { codeTheme: resolvedConfig.theme.codeTheme[resolvedConfig.theme.defaultMode] }),
    codeLineNumbers: resolvedConfig.theme.code.lineNumbers,
    codeWrap: resolvedConfig.theme.code.wrap,
    codeCopyButton: resolvedConfig.theme.code.copyButton
  };
}

function createMarkdownMessages(config: SvedocsResolvedConfig, locale: string | undefined): NonNullable<CompileMarkdownOptions['messages']> {
  const messages = config.i18n.messages[locale ?? config.i18n.defaultLocale ?? 'en']
    ?? config.i18n.messages[config.i18n.defaultLocale ?? 'en']
    ?? config.i18n.messages.en
    ?? defaultSvedocsMessages;
  return {
    'code.copy': messages['code.copy'],
    'code.copyDiff': messages['code.copyDiff'],
    'diff.label': messages['diff.label'],
    'diff.aria': messages['diff.aria'],
    'diff.before': messages['diff.before'],
    'diff.after': messages['diff.after'],
    'heading.anchor': messages['heading.anchor']
  };
}

function createEditUrl(baseUrl: string, sourcePath: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${normalizePath(sourcePath)}`;
}

function createPageCanonicalUrl(config: SvedocsResolvedConfig, routePath: string): string | undefined {
  if (!config.site.url) return undefined;
  return new URL(formatRoutePathForBuildMode(routePath, config.build.mode), config.site.url).href;
}

function dateFrontmatter(value: unknown): string | undefined {
  const text = stringFrontmatter(value);
  if (text) return text;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString();
  return undefined;
}

function titleFromRoute(routePath: string): string {
  const last = routePath.split('/').filter(Boolean).at(-1) ?? 'home';
  return titleFromSegment(last);
}
