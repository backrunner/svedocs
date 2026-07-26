import GithubSlugger from 'github-slugger';
import type { SvedocsContentIssue, SvedocsContentManifest, SvedocsLinkReference, SvedocsPage } from './types.js';
import { extractMarkdownLinksFromAst } from '../mdx/ast.js';
import { resolveSvedocsHref } from './routes.js';

export function extractMarkdownLinks(markdown: string): SvedocsLinkReference[] {
  return extractMarkdownLinksFromAst(markdown);
}

export function createLinkCheckContext(manifest: SvedocsContentManifest) {
  return manifest;
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
  if (target.invalidHash || (target.hash && !knownAnchors(target.page).has(target.hash))) {
    return {
      code: 'broken-anchor',
      severity: 'error',
      message: target.invalidHash
        ? `${page.sourcePath}:${link.line} contains an invalid percent-encoded anchor in ${link.href}.`
        : `${page.sourcePath}:${link.line} links to missing anchor #${target.hash} on ${target.page.routePath}.`,
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
): { page: SvedocsPage | undefined; hash?: string; invalidHash?: boolean } {
  const parts = splitHref(link.href);
  if (!parts.pathname && parts.hash) return { page, hash: parts.hash, ...(parts.invalidHash ? { invalidHash: true } : {}) };
  const resolved = resolveSvedocsHref({
    href: link.href,
    page,
    pages: context.pages,
    config: context.config
  });
  return { page: resolved.page, ...(parts.hash ? { hash: parts.hash } : {}), ...(parts.invalidHash ? { invalidHash: true } : {}) };
}

function splitHref(href: string): { pathname: string; hash?: string; invalidHash?: boolean } {
  const [withoutHash = '', hashWithQuery] = href.trim().split('#');
  const [pathname = ''] = withoutHash.split('?');
  const [hash] = (hashWithQuery ?? '').split('?');
  if (!hash) return { pathname };
  try {
    return { pathname, hash: decodeURIComponent(hash) };
  } catch {
    return { pathname, hash, invalidHash: true };
  }
}

function knownAnchors(page: SvedocsPage): Set<string> {
  const slugger = new GithubSlugger();
  return new Set([slugger.slug(page.title), ...page.headings.map((heading) => heading.id)]);
}
