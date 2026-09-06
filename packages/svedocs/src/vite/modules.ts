import type { SvedocsPage } from '../core/types.js';
export const componentVirtualPrefix = 'virtual:svedocs/component/';
export const pageVirtualPrefix = 'virtual:svedocs/page/';


export function createPageComponentImports(pages: SvedocsPage[], overrides: Record<string, string> = {}): Record<string, string> {
  for (const route of Object.keys(overrides)) {
    if (!pages.some((page) => page.routePath === route)) throw new Error(`No content page found for pageComponents route ${JSON.stringify(route)}.`);
  }
  return Object.fromEntries(pages.flatMap((page) => {
    const component = overrides[page.routePath] ?? (/\.(mdx|svx)$/.test(page.sourcePath)
      ? `${componentVirtualPrefix}${encodeURIComponent(page.id)}.svelte` : undefined);
    return component ? [[page.id, component]] : [];
  }));
}

export function createNamedLoaderModule(entries: Record<string, string>): string {
  return `export default {\n${Object.entries(entries).map(([key, specifier]) =>
    `${JSON.stringify(key)}: () => import(${JSON.stringify(specifier)})`
  ).join(',\n')}\n};`;
}

export function createPageIndex(pages: SvedocsPage[]): SvedocsPage[] {
  return stripPageMarkdown(pages).map((page) => ({
    ...page,
    html: '',
    plainText: '',
    headings: [],
    links: [],
    codeBlocks: [],
    search: []
  }));
}

export function stripPageMarkdown(pages: SvedocsPage[]): SvedocsPage[] {
  return pages.map(({ markdown: _markdown, ...page }) => page);
}

export function createMarkdownMap(pages: SvedocsPage[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const page of pages) {
    if (typeof page.markdown === 'string') map[page.id] = page.markdown;
  }
  return map;
}

export function createPageLoadersModule(pages: SvedocsPage[]): string {
  const entries = pages
    .map((page) => `${JSON.stringify(page.id)}: () => import('${pageVirtualPrefix}${encodeURIComponent(page.id)}.js')`)
    .join(',\n  ');
  return `export default {\n  ${entries}\n};`;
}

export function loadPageDataModule(id: string, pages: SvedocsPage[]): string {
  const pageId = decodeURIComponent(id.slice(`\0${pageVirtualPrefix}`.length).replace(/\.js$/, ''));
  const page = pages.find((item) => item.id === pageId);
  const [data] = page ? stripPageMarkdown([page]) : [undefined];
  return `export default ${JSON.stringify(data)};`;
}

export function createNamedImportModule(entries: Record<string, string | undefined>): string {
  const resolvedEntries = Object.entries(entries)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0);
  const imports = resolvedEntries
    .map(([, specifier], index) => `import C${index} from ${JSON.stringify(specifier)};`)
    .join('\n');
  const exports = resolvedEntries
    .map(([name], index) => `${JSON.stringify(name)}: C${index}`)
    .join(',\n  ');
  return `${imports}\nexport default {\n  ${exports}\n};`;
}
