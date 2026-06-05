import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import type { SvedocsConfig } from '../config.js';
import { compileMarkdown, type CompileMarkdownOptions } from '../mdx/compile.js';
import { checkSvedocsContent } from './checks.js';
import { isResolvedConfig, resolveSvedocsConfig } from './config.js';
import { extractMarkdownLinks } from './links.js';
import { createPageTree, wirePrevNext } from './navigation.js';
import { createPageSearchRecords, createSearchRecords } from './search.js';
import type { SvedocsContentManifest, SvedocsPage, SvedocsResolvedConfig } from './types.js';
import {
  booleanFrontmatter,
  normalizePath,
  numberFrontmatter,
  stringArrayFrontmatter,
  stringFrontmatter,
  stripInlineMarkdown,
  titleFromSegment
} from './utils.js';

export async function loadSvedocsContent(options: {
  projectRoot?: string;
  config?: SvedocsConfig | SvedocsResolvedConfig;
} = {}): Promise<SvedocsContentManifest> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const rawConfig = isResolvedConfig(options.config) ? undefined : options.config;
  const config = isResolvedConfig(options.config)
    ? options.config
    : resolveSvedocsConfig(options.config ?? {});
  const markdownOptions = createMarkdownCompileOptions(rawConfig, config);
  const files = await fg(config.content.include, {
    cwd: projectRoot,
    absolute: false,
    ignore: config.content.exclude,
    onlyFiles: true
  });
  const pages = await Promise.all(
    files
      .filter((file) => isContentFile(file))
      .sort()
      .map((file) => loadContentFile(projectRoot, file, config, markdownOptions))
  );
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
  file: string,
  config: SvedocsResolvedConfig,
  markdownOptions: CompileMarkdownOptions
): Promise<SvedocsPage> {
  const sourcePath = path.join(projectRoot, file);
  const raw = await readFile(sourcePath, 'utf8');
  const fileStats = await stat(sourcePath);
  const parsed = matter(raw);
  const markdown = parsed.content.trim();
  const frontmatter = parsed.data as Record<string, unknown>;
  const discoveredTitle = extractFirstMarkdownTitle(markdown);
  const titleFromFrontmatter = stringFrontmatter(frontmatter.title);
  const renderMarkdown = stripLeadingTitleHeading(markdown, titleFromFrontmatter ?? discoveredTitle);
  const compiled = await compileMarkdown(renderMarkdown, markdownOptions);
  const kind = inferKind(file, config);
  const route = createRouteInfo(file, kind, config);
  const routePath = route.routePath;
  const title = titleFromFrontmatter ?? discoveredTitle ?? compiled.title ?? titleFromRoute(routePath);
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
  const publishedTime = dateFrontmatter(frontmatter.publishedTime)
    ?? dateFrontmatter(frontmatter.published_time)
    ?? dateFrontmatter(frontmatter.published)
    ?? dateFrontmatter(frontmatter.date);
  const updatedTime = dateFrontmatter(frontmatter.updatedTime)
    ?? dateFrontmatter(frontmatter.updated_time)
    ?? dateFrontmatter(frontmatter.updated);
  const canonical = stringFrontmatter(frontmatter.canonical) ?? (
    config.site.url ? new URL(routePath, config.site.url).href : undefined
  );
  const image = stringFrontmatter(frontmatter.image);
  const page: SvedocsPage = {
    id: createPageId(file),
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
      ...(updatedTime ? { updatedTime } : {})
    },
    search: [],
    lastUpdated: fileStats.mtime.toISOString(),
    ...(config.source.editBaseUrl ? { editUrl: createEditUrl(config.source.editBaseUrl, file) } : {})
  };
  page.search = createPageSearchRecords(page, renderMarkdown);
  return page;
}

function createMarkdownCompileOptions(
  rawConfig: SvedocsConfig | undefined,
  resolvedConfig: SvedocsResolvedConfig
): CompileMarkdownOptions {
  return {
    ...(rawConfig?.markdown?.remarkPlugins ? { remarkPlugins: rawConfig.markdown.remarkPlugins } : {}),
    ...(rawConfig?.markdown?.rehypePlugins ? { rehypePlugins: rawConfig.markdown.rehypePlugins } : {}),
    ...(rawConfig?.markdown?.shiki?.transformers ? { shikiTransformers: rawConfig.markdown.shiki.transformers } : {}),
    codeThemes: {
      light: resolvedConfig.theme.codeTheme.light,
      dark: resolvedConfig.theme.codeTheme.dark
    },
    codeLineNumbers: resolvedConfig.theme.code.lineNumbers,
    codeWrap: resolvedConfig.theme.code.wrap,
    codeCopyButton: resolvedConfig.theme.code.copyButton
  };
}

function createEditUrl(baseUrl: string, sourcePath: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${normalizePath(sourcePath)}`;
}

function dateFrontmatter(value: unknown): string | undefined {
  const text = stringFrontmatter(value);
  if (text) return text;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString();
  return undefined;
}

function inferKind(file: string, config: SvedocsResolvedConfig): 'doc' | 'page' {
  return normalizePath(file).startsWith(`${normalizePath(config.content.docs)}/`) ? 'doc' : 'page';
}

interface SvedocsRouteInfo {
  routePath: string;
  scopePath: string;
  slug: string[];
  locale?: string;
}

function createRouteInfo(file: string, kind: 'doc' | 'page', config: SvedocsResolvedConfig): SvedocsRouteInfo {
  const normalized = normalizePath(file);
  const base = normalizePath(kind === 'doc' ? config.content.docs : config.content.pages);
  const relative = normalized.startsWith(`${base}/`) ? normalized.slice(base.length + 1) : normalized;
  const withoutExt = relative.replace(/\.(md|mdx|svx)$/, '');
  const rawParts = withoutExt.split('/').filter(Boolean);
  const parts = rawParts.at(-1) === 'index' ? rawParts.slice(0, -1) : [...rawParts];
  const routeParts = kind === 'doc' ? ['docs'] : [];
  const locale = consumeLocale(parts, config);
  const scopeParts = [...parts];

  if (locale && shouldPrefixLocale(locale, config)) {
    routeParts.push(findLocalePath(locale, config) ?? locale);
  }
  routeParts.push(...parts);

  const routePath = `/${routeParts.join('/')}`.replace(/\/$/, '') || '/';
  const scopePath = `/${[...(kind === 'doc' ? ['docs'] : []), ...scopeParts].join('/')}`.replace(/\/$/, '') || '/';
  return {
    routePath,
    scopePath,
    slug: routePath.split('/').filter(Boolean),
    ...(locale ? { locale } : {})
  };
}

function consumeLocale(parts: string[], config: SvedocsResolvedConfig): string | undefined {
  if (config.i18n.locales.length === 0) return undefined;
  const match = config.i18n.locales.find((locale) => locale.path === parts[0] || locale.code === parts[0]);
  if (match) {
    parts.shift();
    return match.code;
  }
  return config.i18n.defaultLocale;
}

function shouldPrefixLocale(locale: string, config: SvedocsResolvedConfig): boolean {
  return config.i18n.prefixDefaultLocale || locale !== config.i18n.defaultLocale;
}

function findLocalePath(locale: string, config: SvedocsResolvedConfig): string | undefined {
  return config.i18n.locales.find((item) => item.code === locale)?.path;
}

function createPageId(file: string): string {
  return normalizePath(file).replace(/\.(md|mdx|svx)$/, '').replace(/[^a-zA-Z0-9]+/g, '-');
}

function titleFromRoute(routePath: string): string {
  const last = routePath.split('/').filter(Boolean).at(-1) ?? 'home';
  return titleFromSegment(last);
}

function extractFirstMarkdownTitle(markdown: string): string | undefined {
  const match = /^#\s+(.+?)\s*#*$/m.exec(markdown);
  return match?.[1] ? stripInlineMarkdown(match[1]) : undefined;
}

function stripLeadingTitleHeading(markdown: string, title: string | undefined): string {
  if (!title) return markdown;
  const lines = markdown.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex < 0) return markdown;
  const match = /^#\s+(.+?)\s*#*$/.exec(lines[firstContentIndex] ?? '');
  if (!match?.[1]) return markdown;
  const heading = stripInlineMarkdown(match[1]);
  if (heading !== title) return markdown;
  lines.splice(firstContentIndex, 1);
  return lines.join('\n').trim();
}
