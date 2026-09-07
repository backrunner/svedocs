import { stat } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { SvedocsConfig } from '../config.js';
import type { SvedocsRouteInfo } from './discovery.js';
import { normalizeSeoHead } from './frontmatter.js';
import { parseMarkdownAst, prepareMarkdownTitleFromAst, linksFromAst, sectionsFromAst } from '../mdx/ast.js';
import { compileMarkdownWithAst, type CompileMarkdownOptions } from '../mdx/compile.js';
import { defaultSvedocsMessages } from './config.js';
import { resolveSvedocsHref, type SvedocsRouteTarget } from './routes.js';
import { createPageSearchRecord, createSectionRecords } from './search.js';
import type { SvedocsPage, SvedocsResolvedConfig } from './types.js';
import { booleanFrontmatter, formatRoutePathForBuildMode, normalizePath, numberFrontmatter, stringArrayFrontmatter, stringFrontmatter, titleFromSegment } from './utils.js';

export async function loadContentFile(
  projectRoot: string,
  entry: { file: string; id: string; kind: 'doc' | 'page'; raw: string; route: SvedocsRouteInfo },
  routeTargets: SvedocsRouteTarget[],
  config: SvedocsResolvedConfig,
  markdownOptions: CompileMarkdownOptions,
  onDependency?: (file: string) => void
): Promise<SvedocsPage> {
  const { file, id, kind, raw, route } = entry;
  const sourcePath = path.join(projectRoot, file);
  const fileStats = await stat(sourcePath);
  const parsed = matter(raw);
  const markdown = parsed.content.trim();
  const frontmatter = parsed.data as Record<string, unknown>;
  const originalAst = parseMarkdownAst(markdown);
  const prepared = prepareMarkdownTitleFromAst(markdown, originalAst, stringFrontmatter(frontmatter.title));
  const renderMarkdown = prepared.markdown;
  const bodyAst = parseMarkdownAst(renderMarkdown);
  const routePath = route.routePath;
  const currentRoute: SvedocsRouteTarget = {
    kind,
    sourcePath: file,
    routePath,
    scopePath: route.scopePath,
    ...(route.locale ? { locale: route.locale } : {})
  };
  const compiled = await compileMarkdownWithAst(renderMarkdown, {
    ...markdownOptions,
    imageOptimization: {
      ...config.images,
      projectRoot,
      sourcePath: file,
      skip: shouldSkipPageImages(frontmatter),
      onDependency
    },
    messages: createMarkdownMessages(config, route.locale),
    resolveHref: (href) => resolveSvedocsHref({
      href,
      pages: routeTargets,
      config,
      page: currentRoute
    }).href
  }, bodyAst);
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
    links: linksFromAst(originalAst),
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
  page.search = [createPageSearchRecord(page), ...createSectionRecords(page, sectionsFromAst(bodyAst))];
  return page;
}

function shouldSkipPageImages(frontmatter: Record<string, unknown>): boolean {
  return frontmatter.imageCompression === false
    || frontmatter.imageOptimization === false
    || frontmatter.images === false
    || frontmatter.noImageCompression === true;
}

export function createMarkdownCompileOptions(
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
