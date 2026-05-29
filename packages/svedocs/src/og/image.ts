import type { SvedocsPage, SvedocsResolvedConfig } from '../core.js';
import type { OgImageInput, OgImageOptions, OgRenderer, OgRenderOptions, OgTemplate, OgTemplateNode } from './types.js';

export const defaultOgTemplate = {
  name: 'default',
  render: createDefaultOgTemplateNode
} as const;

export function createPageOgImagePath(page: SvedocsPage, format: 'svg' | 'png' = 'svg'): string {
  const name = page.routePath === '/' ? 'index' : page.routePath.replace(/^\/+/, '').replace(/[^a-zA-Z0-9]+/g, '-');
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

export function createPageOgImageEntries(pages: SvedocsPage[], format: 'svg' | 'png' = 'svg'): Array<{ path: string }> {
  return pages
    .filter((page) => !page.hidden)
    .map((page) => ({ path: createPageOgImagePath(page, format).replace(/^\/og\//, '') }));
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
      'cache-control': 'public, max-age=31536000, immutable'
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

export function createOgSvg(input: OgImageInput): string {
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description ?? input.siteName ?? 'svedocs');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#11130f"/>
  <path d="M0 84h1200M0 168h1200M0 252h1200M0 336h1200M0 420h1200M0 504h1200M120 0v630M240 0v630M360 0v630M480 0v630M600 0v630M720 0v630M840 0v630M960 0v630M1080 0v630" stroke="#2f332d" stroke-width="2"/>
  <rect x="84" y="84" width="96" height="96" fill="#50d6b3"/>
  <rect x="180" y="180" width="96" height="96" fill="#ff8a66"/>
  <rect x="84" y="276" width="96" height="96" fill="#f4f1e8"/>
  <text x="300" y="270" fill="#f4f1e8" font-family="Arial, sans-serif" font-size="78" font-weight="800">${title}</text>
  <text x="306" y="352" fill="#aaa698" font-family="Arial, sans-serif" font-size="34">${description}</text>
</svg>`;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}

function importOptionalOgModule<T>(specifier: string): Promise<T> {
  if (typeof process !== 'undefined' && process.versions?.node) {
    return import(specifier) as Promise<T>;
  }
  // Keep optional Node-only OG renderers out of edge bundles unless the caller actually uses them.
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (value: string) => Promise<T>;
  return dynamicImport(specifier);
}
