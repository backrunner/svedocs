import { resolveSvedocsPageRoute } from '../core/routes.js';
import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { isDiscoverablePage } from '../og/sitemap.js';
import { createDisabledDiscoveryResponse, createDiscoveryResponse } from '../og/response.js';

export const markdownContentType = 'text/markdown; charset=utf-8';

export type SvedocsMarkdownMap = Record<string, string>;

export type SvedocsPageMarkdownResolution =
  | { status: 'found'; page: SvedocsPage; source: string }
  | { status: 'redirect'; location: string }
  | { status: 'missing' };

export function createPageMarkdownPath(page: Pick<SvedocsPage, 'routePath'>): string {
  const routePath = page.routePath.replace(/\/+$/, '');
  return routePath ? `${routePath}/index.md` : '/index.md';
}

export function createPageMarkdown(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  markdown?: string
): string {
  const body = (markdown ?? page.markdown ?? '').trim();
  const lines: string[] = [
    '---',
    `title: ${JSON.stringify(page.title)}`,
    ...(page.description ? [`description: ${JSON.stringify(page.description)}`] : []),
    '---',
    ''
  ];
  if (config.agent.llms) {
    lines.push(
      '> Documentation Index',
      `> Fetch the complete documentation index at: ${createAbsoluteUrl(config, '/llms.txt')}`,
      '> Use this file to discover all available pages before exploring further.',
      ''
    );
  }
  lines.push(`# ${sanitizeInline(page.title)}`, '');
  if (body) lines.push(body, '');
  lines.push(`Source: ${createAbsoluteUrl(config, page.routePath)}`);
  return lines.join('\n') + '\n';
}

export function resolvePageMarkdown(
  config: SvedocsResolvedConfig,
  pages: readonly SvedocsPage[],
  markdown: SvedocsMarkdownMap | undefined,
  routePath: string
): SvedocsPageMarkdownResolution {
  if (!config.agent.enabled || !config.agent.markdown) return { status: 'missing' };
  const resolution = resolveSvedocsPageRoute(routePath, pages, config);
  if (resolution.status === 'redirect') {
    return { status: 'redirect', location: createPageMarkdownPath(resolution.page) };
  }
  if (resolution.status !== 'found') return { status: 'missing' };
  const page = resolution.page;
  if (!isDiscoverablePage(page)) return { status: 'missing' };
  const source = markdown?.[page.id] ?? page.markdown;
  if (typeof source !== 'string') return { status: 'missing' };
  return { status: 'found', page, source };
}

export function createPageMarkdownResponse(
  config: SvedocsResolvedConfig,
  pages: readonly SvedocsPage[],
  markdown: SvedocsMarkdownMap | undefined,
  pathname: string,
  request?: Request
): Response {
  if (!config.agent.enabled || !config.agent.markdown) {
    return createDisabledDiscoveryResponse('Agent markdown');
  }
  const routePath = parseMarkdownPathname(pathname);
  const resolution = routePath ? resolvePageMarkdown(config, pages, markdown, routePath) : { status: 'missing' as const };
  if (resolution.status === 'redirect') {
    return new Response(null, {
      status: 307,
      headers: { 'cache-control': 'no-store', location: resolution.location }
    });
  }
  if (resolution.status !== 'found') {
    return new Response('Page not found.', {
      status: 404,
      headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' }
    });
  }
  return createDiscoveryResponse(createPageMarkdown(config, resolution.page, resolution.source), markdownContentType, request);
}

export function createPageMarkdownEntries(
  config: SvedocsResolvedConfig,
  pages: readonly SvedocsPage[],
  markdown?: SvedocsMarkdownMap
): Array<{ path: string }> {
  if (!config.agent.enabled || !config.agent.markdown) return [];
  return pages
    .filter((page) => page.routePath !== '/' && isDiscoverablePage(page) && typeof (markdown?.[page.id] ?? page.markdown) === 'string')
    .map((page) => ({ path: page.routePath.replace(/^\/+|\/+$/g, '') }));
}

export function parseMarkdownPathname(pathname: string): string | undefined {
  const [clean = ''] = pathname.split(/[?#]/, 1);
  if (clean === '/index.md') return '/';
  if (!clean.endsWith('/index.md')) return undefined;
  const routePath = clean.slice(0, -'/index.md'.length);
  return routePath.startsWith('/') ? routePath : undefined;
}

export function sanitizeInline(value: string): string {
  return value.replace(/[[\]]/g, (match) => `\\${match}`).replace(/\s+/g, ' ').trim();
}

function createAbsoluteUrl(config: SvedocsResolvedConfig, value: string): string {
  if (/^https?:\/\//.test(value)) return value;
  if (!config.site.url) return value;
  return new URL(value, config.site.url).href;
}
