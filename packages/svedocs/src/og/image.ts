import { createOgSvg } from './svg.js';
export { createOgSvg } from './svg.js';
import type { SvedocsPage, SvedocsResolvedConfig } from '../core.js';
import type { OgImageInput, OgImageOptions, OgRenderer, OgRenderOptions, OgTemplate, OgTemplateNode } from './types.js';

export const defaultOgTemplate = {
  name: 'default',
  render: createDefaultOgTemplateNode
} as const;

export function createPageOgImagePath(page: SvedocsPage, format: 'svg' | 'png' = 'svg'): string {
  const route = page.routePath === '/' ? 'index' : page.routePath;
  const readable = route.replace(/^\/+/, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
  const digest = stableRouteDigest(page.routePath);
  const name = page.routePath === '/' ? 'index' : `${readable}-${digest}`;
  return `/og/${name}.${format}`;
}

export function createConfiguredOgImageFormat(config: SvedocsResolvedConfig): 'svg' | 'png' {
  return config.seo.ogImage === false ? 'svg' : config.seo.ogImage.format;
}

export function createConfiguredOgImageRenderer(config: SvedocsResolvedConfig): OgRenderer {
  return config.seo.ogImage === false ? 'svg' : config.seo.ogImage.renderer;
}

export function createConfiguredOgImageTemplate(config: SvedocsResolvedConfig): OgTemplate | undefined {
  return config.seo.ogImage !== false && typeof config.seo.ogImage.template === 'function'
    ? config.seo.ogImage.template
    : undefined;
}

export function isOgImageEnabled(config: SvedocsResolvedConfig): boolean {
  return config.seo.ogImage !== false;
}

export function createPageOgImageEntries(pages: SvedocsPage[], format: 'svg' | 'png' = 'svg'): Array<{ path: string }> {
  const entries = pages
    .filter((page) => !page.hidden)
    .map((page) => ({ path: createPageOgImagePath(page, format).replace(/^\/og\//, '') }));
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) {
    throw new Error('Duplicate OG image path detected.');
  }
  return entries;
}

function stableRouteDigest(value: string): string {
  let first = 0xdeadbeef ^ value.length;
  let second = 0x41c6ce57 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
  return `${(second >>> 0).toString(16).padStart(8, '0')}${(first >>> 0).toString(16).padStart(8, '0')}`;
}

export function createConfiguredPageOgImageEntries(config: SvedocsResolvedConfig, pages: SvedocsPage[]): Array<{ path: string }> {
  if (!isOgImageEnabled(config)) return [];
  return createPageOgImageEntries(pages, createConfiguredOgImageFormat(config));
}

export async function createPageOgImageResponse(
  config: SvedocsResolvedConfig,
  page: SvedocsPage,
  options: OgImageOptions = {}
): Promise<Response> {
  const format = options.format ?? createConfiguredOgImageFormat(config);
  const template = options.template ?? createConfiguredOgImageTemplate(config);
  const asset = await createOgImage(
    createOgImageInput(config, page),
    {
      ...options,
      format,
      renderer: options.renderer ?? createConfiguredOgImageRenderer(config),
      ...(template ? { template } : {})
    }
  );
  const body = typeof asset === 'string' ? asset : new Blob([toArrayBuffer(asset)], { type: 'image/png' });
  return new Response(body, {
    headers: {
      'content-type': format === 'png' ? 'image/png' : 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate'
    }
  });
}

export function createOgImageInput(config: SvedocsResolvedConfig, page: SvedocsPage): OgImageInput {
  return {
    title: page.seo.title,
    description: page.seo.description ?? config.site.description,
    siteName: config.site.name
  };
}

export function createDefaultOgTemplateNode(input: OgImageInput): OgTemplateNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '1200px',
        height: '630px',
        background: '#11130f',
        color: '#f4f1e8',
        position: 'relative',
        fontFamily: 'Inter',
        overflow: 'hidden'
      },
      children: [
        gridLayer(),
        pixelMark(),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              position: 'absolute',
              left: '300px',
              top: '200px',
              width: '780px',
              flexDirection: 'column'
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 78,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: '#f4f1e8'
                  },
                  children: input.title
                }
              },
              {
                type: 'div',
                props: {
                  style: {
                    marginTop: 28,
                    fontSize: 34,
                    lineHeight: 1.25,
                    color: '#aaa698'
                  },
                  children: input.description ?? input.siteName ?? 'svedocs'
                }
              }
            ]
          }
        }
      ]
    }
  };
}

export async function createSatoriOgSvg(input: OgImageInput, options: OgRenderOptions): Promise<string> {
  if (!options.fonts?.length) {
    throw new Error('Satori OG rendering requires at least one font.');
  }
  const { default: satori } = await importOptionalOgModule<{
    default: (element: unknown, options: unknown) => Promise<string>;
  }>('satori');
  return satori((options.template ?? createDefaultOgTemplateNode)(input), {
    width: 1200,
    height: 630,
    fonts: options.fonts
  });
}

export async function createOgImage(input: OgImageInput, options: OgImageOptions = {}): Promise<string | Uint8Array> {
  return options.format === 'png' ? createOgPng(input, options) : renderOgSvg(input, options);
}

export async function createOgPng(input: OgImageInput, options: OgRenderOptions = {}): Promise<Uint8Array> {
  const { Resvg } = await importOptionalOgModule<typeof import('@resvg/resvg-js')>('@resvg/resvg-js');
  const renderer = new Resvg(await renderOgSvg(input, options), {
    fitTo: {
      mode: 'width',
      value: 1200
    }
  });
  return renderer.render().asPng();
}

function gridLayer(): OgTemplateNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(#2f332d 2px, transparent 2px), linear-gradient(90deg, #2f332d 2px, transparent 2px)',
        backgroundSize: '120px 84px'
      }
    }
  };
}

function pixelMark(): OgTemplateNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'absolute',
        left: '84px',
        top: '84px',
        width: '192px',
        height: '288px',
        flexWrap: 'wrap'
      },
      children: [
        colorBlock('#50d6b3'),
        colorBlock('transparent'),
        colorBlock('transparent'),
        colorBlock('#ff8a66'),
        colorBlock('#f4f1e8'),
        colorBlock('transparent')
      ]
    }
  };
}

function colorBlock(color: string): OgTemplateNode {
  return {
    type: 'div',
    props: {
      style: {
        width: '96px',
        height: '96px',
        background: color
      }
    }
  };
}

async function renderOgSvg(input: OgImageInput, options: OgRenderOptions): Promise<string> {
  return options.renderer === 'satori' ? createSatoriOgSvg(input, options) : createOgSvg(input);
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}

async function importOptionalOgModule<T>(specifier: string): Promise<T> {
  if (typeof process !== 'undefined' && process.versions?.node) {
    // Prerender bundles live in the app, while pnpm keeps renderers under svedocs.
    const { createRequire } = await import(/* @vite-ignore */ 'node:module');
    const frameworkRequire = createRequire(import.meta.resolve('svedocs/og'));
    // Load native CommonJS through Node, bypassing Vite's ESM module runner in dev.
    const loaded = frameworkRequire(specifier);
    return (specifier === 'satori' ? { default: loaded.default ?? loaded } : loaded) as T;
  }
  // Keep optional Node-only OG renderers out of edge bundles unless the caller actually uses them.
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (value: string) => Promise<T>;
  return dynamicImport(specifier);
}
