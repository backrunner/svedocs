import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import type { SvedocsResolvedConfig } from './core.js';
import { resolveSvedocsConfig } from './core.js';
import type { OgTemplate } from './og/types.js';

export interface SvedocsNavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface SvedocsThemeBrand {
  label?: string;
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
}

export interface SvedocsShikiOptions {
  transformers?: unknown[];
}

export interface SvedocsThemeHomeAction {
  label: string;
  href: string;
}

export interface SvedocsThemeHomeVisual {
  type?: 'pixel' | 'image';
  src?: string;
  alt?: string;
}

export interface SvedocsThemeHome {
  kicker?: string;
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
    robots?: boolean;
    defaultAuthor?: string;
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
    }>;
    prefixDefaultLocale?: boolean;
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
          wrap: z.boolean().optional()
        })
        .optional(),
      brand: z
        .object({
          label: z.string().optional(),
          href: z.string().optional(),
          logo: z.string().optional(),
          mark: z.union([z.literal('pixel'), z.literal(false)]).optional()
        })
        .optional(),
      nav: z
        .array(
          z.object({
            label: z.string(),
            href: z.string(),
            external: z.boolean().optional()
          })
        )
        .optional(),
      social: z
        .array(
          z.object({
            label: z.string(),
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
          primaryAction: z
            .object({
              label: z.string(),
              href: z.string()
            })
            .optional(),
          secondaryAction: z
            .object({
              label: z.string(),
              href: z.string()
            })
            .optional(),
          visual: z
            .object({
              type: z.enum(['pixel', 'image']).optional(),
              src: z.string().optional(),
              alt: z.string().optional()
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
      robots: z.boolean().optional(),
      defaultAuthor: z.string().optional(),
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
                path: z.string().optional()
              })
            ])
          )
          .optional(),
        prefixDefaultLocale: z.boolean().optional()
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
  return svedocsConfigSchema.parse(config) as SvedocsConfig;
}

export async function loadSvedocsConfigFile(
  configFile: string,
  fallback: SvedocsConfig = {}
): Promise<SvedocsResolvedConfig> {
  try {
    const module = await import(pathToFileURL(configFile).href);
    return loadSvedocsConfig((module.default ?? module.config ?? fallback) as SvedocsConfig);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
      return loadSvedocsConfig(fallback);
    }
    throw error;
  }
}
