import path from 'node:path';
import GithubSlugger from 'github-slugger';
import type { SvedocsContentIssue, SvedocsContentManifest, SvedocsLinkReference, SvedocsPage } from './types.js';
import { extractMarkdownLinksFromAst } from '../mdx/ast.js';
import { normalizePath, stripContentExtension } from './utils.js';

export function extractMarkdownLinks(markdown: string): SvedocsLinkReference[] {
  return extractMarkdownLinksFromAst(markdown);
}

export function createLinkCheckContext(manifest: SvedocsContentManifest) {
  const routeMap = new Map(manifest.pages.map((page) => [page.routePath, page]));
  const sourceMap = new Map<string, SvedocsPage>();
  for (const page of manifest.pages) {
    const source = stripContentExtension(normalizePath(page.sourcePath));
    sourceMap.set(source, page);
    if (source.endsWith('/index')) sourceMap.set(source.slice(0, -'/index'.length), page);
  }
  return { routeMap, sourceMap };
}

export function checkLink(
  page: SvedocsPage,
  link: SvedocsLinkReference,
  context: ReturnType<typeof createLinkCheckContext>
): SvedocsContentIssue | undefined {
  if (['asset', 'external', 'mailto', 'tel'].includes(link.kind)) return undefined;
  const target = resolveLinkTarget(page, link, context);
  if (!target.page) {
    return {
      code: 'broken-link',
      severity: 'error',
      message: `${page.sourcePath}:${link.line} links to missing page ${link.href}.`,
      pageId: page.id,
      sourcePath: page.sourcePath,
      href: link.href
    };
  }
  if (target.hash && !knownAnchors(target.page).has(target.hash)) {
    return {
      code: 'broken-anchor',
      severity: 'error',
      message: `${page.sourcePath}:${link.line} links to missing anchor #${target.hash} on ${target.page.routePath}.`,
      pageId: page.id,
      sourcePath: page.sourcePath,
      href: link.href
    };
  }
  return undefined;
}

function resolveLinkTarget(
  page: SvedocsPage,
  link: SvedocsLinkReference,
  context: ReturnType<typeof createLinkCheckContext>
): { page: SvedocsPage | undefined; hash?: string } {
  const parts = splitHref(link.href);
  if (!parts.pathname && parts.hash) return { page, hash: parts.hash };
  if (parts.pathname.startsWith('/')) {
    return {
      page: context.routeMap.get(normalizeRouteTarget(parts.pathname)),
      ...(parts.hash ? { hash: parts.hash } : {})
    };
  }
  const sourceTarget = resolveSourceTarget(page, parts.pathname, context.sourceMap);
  if (sourceTarget) return { page: sourceTarget, ...(parts.hash ? { hash: parts.hash } : {}) };
  const routeTarget = resolveRouteTarget(page, parts.pathname, context.routeMap);
  return { page: routeTarget, ...(parts.hash ? { hash: parts.hash } : {}) };
}

function splitHref(href: string): { pathname: string; hash?: string } {
  const [withoutHash = '', hashWithQuery] = href.trim().split('#');
  const [pathname = ''] = withoutHash.split('?');
  const [hash] = (hashWithQuery ?? '').split('?');
  return {
    pathname,
    ...(hash ? { hash: decodeURIComponent(hash) } : {})
  };
}

function resolveSourceTarget(
  page: SvedocsPage,
  pathname: string,
  sourceMap: Map<string, SvedocsPage>
): SvedocsPage | undefined {
  if (!pathname) return page;
  const sourceDir = path.posix.dirname(normalizePath(page.sourcePath));
  const target = stripContentExtension(path.posix.normalize(path.posix.join(sourceDir, pathname)));
  return sourceMap.get(target) ?? sourceMap.get(`${target}/index`);
}

function resolveRouteTarget(
  page: SvedocsPage,
  pathname: string,
  routeMap: Map<string, SvedocsPage>
): SvedocsPage | undefined {
  if (!pathname) return page;
  const base = page.routePath === '/' ? '/' : path.posix.dirname(page.routePath);
  const target = normalizeRouteTarget(path.posix.join(base, pathname));
  return routeMap.get(target);
}

function normalizeRouteTarget(route: string): string {
  const normalized = path.posix
    .normalize(`/${route.replace(/^\/+/, '')}`)
    .replace(/\.(md|mdx|svx|html)$/i, '')
    .replace(/\/index$/, '');
  return normalized === '/' ? '/' : normalized.replace(/\/$/, '');
}

function knownAnchors(page: SvedocsPage): Set<string> {
  const slugger = new GithubSlugger();
  return new Set([slugger.slug(page.title), ...page.headings.map((heading) => heading.id)]);
}
