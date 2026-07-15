import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import type { SvedocsResolvedConfig } from './core.js';
import { resolveSvedocsConfig } from './core.js';
import type { SvedocsMessages, SvedocsSeoHead } from './core/types.js';
import type { OgTemplate } from './og/types.js';

export interface SvedocsNavItem {
  label: string;
  labelKey?: string;
  href: string;
  external?: boolean;
}

export interface SvedocsThemeBrand {
  label?: string;
  labelKey?: string;
  href?: string;
  logo?: string;
  mark?: 'pixel' | false;
}

export interface SvedocsThemePalette {
  accent?: string;
  neutral?: string;
}

export interface SvedocsThemeFonts {
  sans?: string;
  mono?: string;
  display?: string;
}

export interface SvedocsThemeCodeTheme {
  light?: string;
  dark?: string;
}

export interface SvedocsThemeCode {
  lineNumbers?: boolean;
  wrap?: boolean;
  copyButton?: boolean;
}

export interface SvedocsShikiOptions {
  transformers?: unknown[];
}

export interface SvedocsThemeHomeAction {
  label: string;
  labelKey?: string;
  href: string;
}

export interface SvedocsThemeHomeVisual {
  type?: 'pixel' | 'image';
  src?: string;
  alt?: string;
  altKey?: string;
}

export interface SvedocsThemeHome {
  kicker?: string;
  kickerKey?: string;
  primaryAction?: SvedocsThemeHomeAction;
  secondaryAction?: SvedocsThemeHomeAction;
  visual?: SvedocsThemeHomeVisual;
}

export interface SvedocsThemeFooter {
  text?: string;
  links?: SvedocsNavItem[];
}

export interface SvedocsMarkdownOptions {
  remarkPlugins?: unknown[];
  rehypePlugins?: unknown[];
  shiki?: SvedocsShikiOptions;
}

export interface SvedocsRssOptions {
  title?: string;
  description?: string;
  limit?: number;
  locale?: string;
}

export interface SvedocsConfig {
  site?: {
    name?: string;
    title?: string;
    description?: string;
    url?: string;
  };
  content?: {
    root?: string;
    docs?: string;
    pages?: string;
    include?: string[];
    exclude?: string[];
  };
  build?: {
    mode?: 'edge' | 'static' | 'spa';
  };
  theme?: {
    defaultMode?: 'light' | 'dark' | 'system';
    palette?: SvedocsThemePalette;
    fonts?: SvedocsThemeFonts;
    radius?: string;
    codeTheme?: string | SvedocsThemeCodeTheme;
    code?: SvedocsThemeCode;
    brand?: SvedocsThemeBrand;
    nav?: SvedocsNavItem[];
    social?: SvedocsNavItem[];
    footer?: false | SvedocsThemeFooter;
    home?: SvedocsThemeHome;
  };
  markdown?: SvedocsMarkdownOptions;
  search?: false | {
    enabled?: boolean;
    provider?: 'local' | 'algolia' | 'typesense' | 'cloudflare-ai-search' | string;
    scope?: 'current' | 'all';
  };
  ai?: false | {
    enabled?: boolean;
    provider?: 'mock' | 'cloudflare-workers-ai' | 'cloudflare-ai-search' | 'openai-compatible' | string;
    scope?: 'current' | 'all';
    label?: string;
    systemPrompt?: string;
    welcomeMessage?: string;
    placeholder?: string;
    suggestions?: string[];
    maxResults?: number;
  };
  seo?: {
    sitemap?: boolean;
    rss?: boolean | SvedocsRssOptions;
    robots?: boolean;
    defaultAuthor?: string;
    head?: SvedocsSeoHead;
    ogImage?: false | {
      template?: 'default' | string | OgTemplate;
      format?: 'svg' | 'png';
      outDir?: string;
      renderer?: 'svg' | 'satori';
    };
  };
  source?: {
    editBaseUrl?: string;
  };
  checks?: {
    assets?: boolean;
    externalLinks?: boolean;
    translations?: boolean;
  };
  cloudflare?: {
    compatibilityDate?: string;
    aiSearch?: {
      binding?: string;
      instanceName?: string;
      namespace?: string;
      remote?: boolean;
    };
  };
  i18n?: false | {
    defaultLocale?: string;
    locales?: Array<string | {
      code: string;
      label?: string;
      path?: string;
      hreflang?: string;
      dir?: 'ltr' | 'rtl';
    }>;
    prefixDefaultLocale?: boolean;
    messages?: Record<string, Partial<SvedocsMessages>>;
  };
}

export type { SvedocsResolvedConfig };

export const svedocsConfigSchema = z.object({
  site: z
    .object({
      name: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      url: z.string().url().optional()
    })
    .optional(),
  content: z
    .object({
      root: z.string().optional(),
      docs: z.string().optional(),
      pages: z.string().optional(),
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional()
    })
    .optional(),
  build: z
    .object({
      mode: z.enum(['edge', 'static', 'spa']).optional()
    })
    .optional(),
  theme: z
    .object({
      defaultMode: z.enum(['light', 'dark', 'system']).optional(),
      palette: z
        .object({
          accent: z.string().optional(),
          neutral: z.string().optional()
        })
        .optional(),
      fonts: z
        .object({
          sans: z.string().optional(),
          mono: z.string().optional(),
          display: z.string().optional()
        })
        .optional(),
      radius: z.string().optional(),
      codeTheme: z
        .union([
          z.string(),
          z.object({
            light: z.string().optional(),
            dark: z.string().optional()
          })
        ])
        .optional(),
      code: z
        .object({
          lineNumbers: z.boolean().optional(),
          wrap: z.boolean().optional(),
          copyButton: z.boolean().optional()
        })
        .optional(),
      brand: z
        .object({
          label: z.string().optional(),
          labelKey: z.string().optional(),
          href: z.string().optional(),
          logo: z.string().optional(),
          mark: z.union([z.literal('pixel'), z.literal(false)]).optional()
        })
        .optional(),
      nav: z
        .array(
          z.object({
            label: z.string(),
            labelKey: z.string().optional(),
            href: z.string(),
            external: z.boolean().optional()
          })
        )
        .optional(),
      social: z
        .array(
          z.object({
            label: z.string(),
            labelKey: z.string().optional(),
            href: z.string(),
            external: z.boolean().optional()
          })
        )
        .optional(),
      footer: z
        .union([
          z.literal(false),
          z.object({
            text: z.string().optional(),
            links: z
              .array(
                z.object({
                  label: z.string(),
                  labelKey: z.string().optional(),
                  href: z.string(),
                  external: z.boolean().optional()
                })
              )
              .optional()
          })
        ])
        .optional(),
      home: z
        .object({
          kicker: z.string().optional(),
          kickerKey: z.string().optional(),
          primaryAction: z
            .object({
              label: z.string(),
              labelKey: z.string().optional(),
              href: z.string()
            })
            .optional(),
          secondaryAction: z
            .object({
              label: z.string(),
              labelKey: z.string().optional(),
              href: z.string()
            })
            .optional(),
          visual: z
            .object({
              type: z.enum(['pixel', 'image']).optional(),
              src: z.string().optional(),
              alt: z.string().optional(),
              altKey: z.string().optional()
            })
            .optional()
        })
        .optional()
    })
    .optional(),
  markdown: z
    .object({
      remarkPlugins: z.array(z.unknown()).optional(),
      rehypePlugins: z.array(z.unknown()).optional(),
      shiki: z
        .object({
          transformers: z.array(z.unknown()).optional()
        })
        .optional()
    })
    .optional(),
  search: z
    .union([
      z.literal(false),
      z.object({
        enabled: z.boolean().optional(),
        provider: z.string().optional(),
        scope: z.enum(['current', 'all']).optional()
      })
    ])
    .optional(),
  ai: z
    .union([
      z.literal(false),
      z.object({
        enabled: z.boolean().optional(),
        provider: z.string().optional(),
        scope: z.enum(['current', 'all']).optional(),
        label: z.string().optional(),
        systemPrompt: z.string().optional(),
        welcomeMessage: z.string().optional(),
        placeholder: z.string().optional(),
        suggestions: z.array(z.string()).optional(),
        maxResults: z.number().int().positive().optional()
      })
    ])
    .optional(),
  seo: z
    .object({
      sitemap: z.boolean().optional(),
      rss: z
        .union([
          z.boolean(),
          z.object({
            title: z.string().min(1).optional(),
            description: z.string().min(1).optional(),
            limit: z.number().int().positive().max(1000).optional(),
            locale: z.string().min(1).optional()
          })
        ])
        .optional(),
      robots: z.boolean().optional(),
      defaultAuthor: z.string().optional(),
      head: z
        .object({
          meta: z
            .array(
              z.object({
                name: z.string().optional(),
                property: z.string().optional(),
                httpEquiv: z.string().optional(),
                itemprop: z.string().optional(),
                content: z.string()
              })
            )
            .optional(),
          links: z
            .array(
              z.object({
                rel: z.string(),
                href: z.string(),
                hreflang: z.string().optional(),
                type: z.string().optional(),
                media: z.string().optional(),
                title: z.string().optional(),
                sizes: z.string().optional(),
                as: z.string().optional(),
                crossorigin: z.string().optional()
              })
            )
            .optional(),
          jsonLd: z.array(z.record(z.string(), z.unknown())).optional(),
          jsonld: z.array(z.record(z.string(), z.unknown())).optional(),
          'json-ld': z.array(z.record(z.string(), z.unknown())).optional()
        })
        .optional(),
      ogImage: z
        .union([
          z.literal(false),
          z.object({
            template: z.union([z.string(), z.custom<OgTemplate>((value) => typeof value === 'function')]).optional(),
            format: z.enum(['svg', 'png']).optional(),
            outDir: z.string().optional(),
            renderer: z.enum(['svg', 'satori']).optional()
          })
        ])
        .optional()
    })
    .optional(),
  source: z
    .object({
      editBaseUrl: z.string().url().optional()
    })
    .optional(),
  checks: z
    .object({
      assets: z.boolean().optional(),
      externalLinks: z.boolean().optional(),
      translations: z.boolean().optional()
    })
    .optional(),
  cloudflare: z
    .object({
      compatibilityDate: z.string().optional(),
      aiSearch: z
        .object({
          binding: z.string().optional(),
          instanceName: z.string().optional(),
          namespace: z.string().optional(),
          remote: z.boolean().optional()
        })
        .optional()
    })
    .optional(),
  i18n: z
    .union([
      z.literal(false),
      z.object({
        defaultLocale: z.string().optional(),
        locales: z
          .array(
            z.union([
              z.string(),
              z.object({
                code: z.string(),
                label: z.string().optional(),
                path: z.string().optional(),
                hreflang: z.string().optional(),
                dir: z.enum(['ltr', 'rtl']).optional()
              })
            ])
          )
          .optional(),
        prefixDefaultLocale: z.boolean().optional(),
        messages: z.record(z.string(), z.record(z.string(), z.string())).optional()
      })
    ])
    .optional()
});

export function defineConfig(config: SvedocsConfig): SvedocsConfig {
  return config;
}

export function loadSvedocsConfig(config: SvedocsConfig = {}): SvedocsResolvedConfig {
  return resolveSvedocsConfig(validateSvedocsConfig(config));
}

export function validateSvedocsConfig(config: SvedocsConfig): SvedocsConfig {
  const validated = svedocsConfigSchema.parse(config) as SvedocsConfig;
  resolveSvedocsConfig(validated);
  return validated;
}

export async function loadSvedocsConfigFile(
  configFile: string,
  fallback: SvedocsConfig = {}
): Promise<SvedocsResolvedConfig> {
  try {
    await access(configFile);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return loadSvedocsConfig(fallback);
    }
    throw error;
  }
  const module = await import(pathToFileURL(configFile).href);
  return loadSvedocsConfig((module.default ?? module.config ?? fallback) as SvedocsConfig);
}
