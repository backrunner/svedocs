import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { validateSvedocsConfig, type SvedocsConfig } from '../config.js';
import { compileMarkdown, type CompileMarkdownOptions } from '../mdx/compile.js';
import { checkSvedocsContent } from './checks.js';
import { defaultSvedocsMessages, isResolvedConfig, resolveSvedocsConfig } from './config.js';
import { extractMarkdownLinks } from './links.js';
import { createPageTree, wirePrevNext } from './navigation.js';
import { resolveSvedocsHref, type SvedocsRouteTarget } from './routes.js';
import { createPageSearchRecords, createSearchRecords } from './search.js';
import type { SvedocsContentManifest, SvedocsPage, SvedocsResolvedConfig, SvedocsSeoHead, SvedocsSeoJsonLd, SvedocsSeoLinkTag, SvedocsSeoMetaTag } from './types.js';
import {
  booleanFrontmatter,
  formatRoutePathForBuildMode,
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
    : resolveSvedocsConfig(validateSvedocsConfig(options.config ?? {}));
  const markdownOptions = createMarkdownCompileOptions(rawConfig, config);
  const files = await fg(config.content.include, {
    cwd: projectRoot,
    absolute: false,
    ignore: config.content.exclude,
    onlyFiles: true
  });
  const entries = assignUniquePageIds(files
    .filter((file) => isContentFile(file))
    .sort()
    .map((file) => {
      const kind = inferKind(file, config);
      return { file, kind, route: createRouteInfo(file, kind, config) };
    }));
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
  entry: { file: string; id: string; kind: 'doc' | 'page'; route: SvedocsRouteInfo },
  routeTargets: SvedocsRouteTarget[],
  config: SvedocsResolvedConfig,
  markdownOptions: CompileMarkdownOptions
): Promise<SvedocsPage> {
  const { file, id, kind, route } = entry;
  const sourcePath = path.join(projectRoot, file);
  const raw = await readFile(sourcePath, 'utf8');
  const fileStats = await stat(sourcePath);
  const parsed = matter(raw);
  const markdown = parsed.content.trim();
  const frontmatter = parsed.data as Record<string, unknown>;
  const discoveredTitle = extractFirstMarkdownTitle(markdown);
  const titleFromFrontmatter = stringFrontmatter(frontmatter.title);
  const renderMarkdown = stripLeadingTitleHeading(markdown, titleFromFrontmatter ?? discoveredTitle);
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
    messages: createMarkdownMessages(config, route.locale),
    resolveHref: (href) => resolveSvedocsHref({
      href,
      pages: routeTargets,
      config,
      page: currentRoute
    }).href
  });
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

function normalizeSeoHead(value: unknown): SvedocsSeoHead | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const meta = Array.isArray(input.meta) ? input.meta.map(normalizeSeoMetaTag).filter((tag): tag is SvedocsSeoMetaTag => Boolean(tag)) : [];
  const links = Array.isArray(input.links) ? input.links.map(normalizeSeoLinkTag).filter((tag): tag is SvedocsSeoLinkTag => Boolean(tag)) : [];
  const jsonLdInput = input.jsonLd ?? input.jsonld ?? input['json-ld'];
  const jsonLd = Array.isArray(jsonLdInput) ? jsonLdInput.map(normalizeSeoJsonLd).filter((tag): tag is SvedocsSeoJsonLd => Boolean(tag)) : [];
  if (meta.length === 0 && links.length === 0 && jsonLd.length === 0) return undefined;
  return {
    ...(meta.length > 0 ? { meta } : {}),
    ...(links.length > 0 ? { links } : {}),
    ...(jsonLd.length > 0 ? { jsonLd } : {})
  };
}

function normalizeSeoMetaTag(value: unknown): SvedocsSeoMetaTag | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const content = stringFrontmatter(input.content);
  if (!content) return undefined;
  const tag: SvedocsSeoMetaTag = { content };
  const name = stringFrontmatter(input.name);
  const property = stringFrontmatter(input.property);
  const httpEquiv = stringFrontmatter(input.httpEquiv) ?? stringFrontmatter(input['http-equiv']);
  const itemprop = stringFrontmatter(input.itemprop);
  if (name) tag.name = name;
  if (property) tag.property = property;
  if (httpEquiv) tag.httpEquiv = httpEquiv;
  if (itemprop) tag.itemprop = itemprop;
  return tag.name || tag.property || tag.httpEquiv || tag.itemprop ? tag : undefined;
}

function normalizeSeoLinkTag(value: unknown): SvedocsSeoLinkTag | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const rel = stringFrontmatter(input.rel);
  const href = stringFrontmatter(input.href);
  if (!rel || !href) return undefined;
  const tag: SvedocsSeoLinkTag = { rel, href };
  const hreflang = stringFrontmatter(input.hreflang);
  const type = stringFrontmatter(input.type);
  const media = stringFrontmatter(input.media);
  const title = stringFrontmatter(input.title);
  const sizes = stringFrontmatter(input.sizes);
  const as = stringFrontmatter(input.as);
  const crossorigin = stringFrontmatter(input.crossorigin);
  if (hreflang) tag.hreflang = hreflang;
  if (type) tag.type = type;
  if (media) tag.media = media;
  if (title) tag.title = title;
  if (sizes) tag.sizes = sizes;
  if (as) tag.as = as;
  if (crossorigin) tag.crossorigin = crossorigin;
  return tag;
}

function normalizeSeoJsonLd(value: unknown): SvedocsSeoJsonLd | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as SvedocsSeoJsonLd : undefined;
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
  const match = config.i18n.locales.find((locale) => locale.path === parts[0]);
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

function assignUniquePageIds<T extends { file: string }>(entries: T[]): Array<T & { id: string }> {
  const candidates = entries.map((entry) => createPageId(entry.file));
  const counts = new Map<string, number>();
  for (const candidate of candidates) counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
  return entries.map((entry, index) => {
    const candidate = candidates[index] ?? createPageId(entry.file);
    if ((counts.get(candidate) ?? 0) === 1) return { ...entry, id: candidate };
    const digest = createHash('sha256').update(normalizePath(entry.file)).digest('hex').slice(0, 10);
    return { ...entry, id: `${candidate}-${digest}` };
  });
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
