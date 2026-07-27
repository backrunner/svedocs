import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { isDiscoverablePage } from '../og/sitemap.js';
import { createDisabledDiscoveryResponse, createDiscoveryResponse } from '../og/response.js';
import { createPageMarkdownPath, sanitizeInline, type SvedocsMarkdownMap } from './markdown.js';

const llmsContentType = 'text/plain; charset=utf-8';

export function createLlmsTxt(
  config: SvedocsResolvedConfig,
  pages: readonly SvedocsPage[],
  markdown?: SvedocsMarkdownMap
): string {
  const lines: string[] = [
    `# ${sanitizeInline(config.site.title)}`,
    '',
    sanitizeInline(config.site.description),
    '',
    `Full corpus (all pages, one document): ${createAbsoluteUrl(config, '/llms-full.txt')}`,
    '',
    '## Pages',
    ''
  ];
  for (const page of listLlmsPages(config, pages, markdown)) {
    const url = createAbsoluteUrl(config, createPageMarkdownPath(page));
    const title = sanitizeInline(page.title);
    lines.push(page.description ? `- [${title}](${url}) — ${sanitizeInline(page.description)}` : `- [${title}](${url})`);
  }
  return lines.join('\n') + '\n';
}

export function createLlmsFullTxt(
  config: SvedocsResolvedConfig,
  pages: readonly SvedocsPage[],
  markdown?: SvedocsMarkdownMap
): string {
  const lines: string[] = [
    `# ${sanitizeInline(config.site.title)}`,
    '',
    `> ${sanitizeInline(config.site.description)}`,
    '',
    `Index: ${createAbsoluteUrl(config, '/llms.txt')}`,
    ''
  ];
  for (const page of listLlmsPages(config, pages, markdown)) {
    const body = (markdown?.[page.id] ?? page.markdown ?? '').trim();
    lines.push(
      '---',
      '',
      `# ${sanitizeInline(page.title)}`,
      '',
      ...(page.description ? [`> ${sanitizeInline(page.description)}`, ''] : []),
      `Source: ${createAbsoluteUrl(config, page.routePath)} · Markdown: ${createAbsoluteUrl(config, createPageMarkdownPath(page))}`,
      '',
      body,
      ''
    );
  }
  return lines.join('\n') + '\n';
}

export function createLlmsTxtResponse(
  config: SvedocsResolvedConfig,
  pages: readonly SvedocsPage[],
  markdown?: SvedocsMarkdownMap,
  request?: Request
): Response {
  if (!config.agent.enabled || !config.agent.llms || !config.agent.markdown) return createDisabledDiscoveryResponse('llms.txt');
  return createDiscoveryResponse(createLlmsTxt(config, pages, markdown), llmsContentType, request);
}

export function createLlmsFullTxtResponse(
  config: SvedocsResolvedConfig,
  pages: readonly SvedocsPage[],
  markdown?: SvedocsMarkdownMap,
  request?: Request
): Response {
  if (!config.agent.enabled || !config.agent.llms || !config.agent.markdown) return createDisabledDiscoveryResponse('llms-full.txt');
  return createDiscoveryResponse(createLlmsFullTxt(config, pages, markdown), llmsContentType, request);
}

function listLlmsPages(
  config: SvedocsResolvedConfig,
  pages: readonly SvedocsPage[],
  markdown?: SvedocsMarkdownMap
): SvedocsPage[] {
  const defaultLocale = config.i18n.defaultLocale;
  return pages
    .filter((page) => isDiscoverablePage(page))
    .filter((page) => !defaultLocale || !page.locale || page.locale === defaultLocale)
    .filter((page) => Boolean((markdown?.[page.id] ?? page.markdown)?.trim()))
    .slice()
    .sort((a, b) => a.routePath.localeCompare(b.routePath));
}

function createAbsoluteUrl(config: SvedocsResolvedConfig, value: string): string {
  if (/^https?:\/\//.test(value)) return value;
  if (!config.site.url) return value;
  return new URL(value, config.site.url).href;
}
