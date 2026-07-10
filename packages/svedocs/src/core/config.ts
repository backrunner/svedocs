import type { SvedocsConfig } from '../config.js';
import { resolveSvedocsI18nConfig } from './i18n.js';
import type { SvedocsResolvedConfig } from './types.js';

export { defaultSvedocsMessages } from './i18n.js';

export function resolveSvedocsConfig(config: SvedocsConfig = {}): SvedocsResolvedConfig {
  const contentRoot = config.content?.root ?? 'content';
  const docsRoot = config.content?.docs ?? `${contentRoot}/docs`;
  const pagesRoot = config.content?.pages ?? `${contentRoot}/pages`;
  const search = config.search === false ? { enabled: false, provider: 'local', scope: 'current' as const } : {
    enabled: config.search?.enabled ?? true,
    provider: config.search?.provider ?? 'local',
    scope: config.search?.scope ?? 'current'
  };
  const ai = config.ai === false ? {
    enabled: false,
    provider: 'mock',
    scope: 'current' as const,
    label: 'Ask AI',
    placeholder: 'Ask about the docs',
    suggestions: [] as string[],
    maxResults: 5
  } : {
    enabled: config.ai?.enabled ?? Boolean(config.ai?.provider),
    provider: config.ai?.provider ?? 'mock',
    scope: config.ai?.scope ?? 'current',
    label: config.ai?.label ?? 'Ask AI',
    placeholder: config.ai?.placeholder ?? 'Ask about the docs',
    suggestions: config.ai?.suggestions ?? [],
    maxResults: config.ai?.maxResults ?? 5,
    ...(config.ai?.systemPrompt ? { systemPrompt: config.ai.systemPrompt } : {}),
    ...(config.ai?.welcomeMessage ? { welcomeMessage: config.ai.welcomeMessage } : {})
  };

  return {
    site: {
      name: config.site?.name ?? 'svedocs',
      title: config.site?.title ?? config.site?.name ?? 'svedocs',
      description: config.site?.description ?? 'SvelteKit-native documentation framework.',
      ...(config.site?.url ? { url: config.site.url } : {})
    },
    content: {
      root: contentRoot,
      docs: docsRoot,
      pages: pagesRoot,
      include: config.content?.include ?? [`${contentRoot}/**/*.{md,mdx,svx}`],
      exclude: config.content?.exclude ?? [
        '**/_*.{md,mdx,svx}',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.svelte-kit/**'
      ]
    },
    build: {
      mode: config.build?.mode ?? 'edge'
    },
    theme: {
      defaultMode: config.theme?.defaultMode ?? 'system',
      palette: {
        accent: config.theme?.palette?.accent ?? 'emerald',
        neutral: config.theme?.palette?.neutral ?? 'zinc'
      },
      fonts: {
        sans: config.theme?.fonts?.sans ?? '"IBM Plex Sans", "Avenir Next", sans-serif',
        mono: config.theme?.fonts?.mono ?? '"JetBrains Mono", "SFMono-Regular", monospace',
        display: config.theme?.fonts?.display ?? '"IBM Plex Sans", "Avenir Next", sans-serif'
      },
      radius: config.theme?.radius ?? '0px',
      codeTheme: resolveCodeTheme(config.theme?.codeTheme),
      code: {
        lineNumbers: config.theme?.code?.lineNumbers ?? true,
        wrap: config.theme?.code?.wrap ?? false,
        copyButton: config.theme?.code?.copyButton ?? true
      },
      brand: {
        label: config.theme?.brand?.label ?? config.site?.name ?? 'svedocs',
        ...(config.theme?.brand?.labelKey ? { labelKey: config.theme.brand.labelKey } : {}),
        href: config.theme?.brand?.href ?? '/',
        ...(config.theme?.brand?.logo ? { logo: config.theme.brand.logo } : {}),
        mark: config.theme?.brand?.mark ?? 'pixel'
      },
      nav: config.theme?.nav ?? [
        { label: 'Docs', labelKey: 'nav.docs', href: '/docs' }
      ],
      social: config.theme?.social ?? [],
      footer: config.theme?.footer === false
        ? false
        : {
            text: config.theme?.footer?.text ?? `MIT licensed. Built with ${config.site?.name ?? 'svedocs'}.`,
            links: config.theme?.footer?.links ?? []
          },
      home: {
        kicker: config.theme?.home?.kicker ?? 'SvelteKit-native docs',
        ...(config.theme?.home?.kickerKey ? { kickerKey: config.theme.home.kickerKey } : {}),
        ...(config.theme?.home?.primaryAction ? { primaryAction: config.theme.home.primaryAction } : {}),
        ...(config.theme?.home?.secondaryAction ? { secondaryAction: config.theme.home.secondaryAction } : {}),
        visual: {
          type: config.theme?.home?.visual?.type ?? 'pixel',
          ...(config.theme?.home?.visual?.src ? { src: config.theme.home.visual.src } : {}),
          alt: config.theme?.home?.visual?.alt ?? '',
          ...(config.theme?.home?.visual?.altKey ? { altKey: config.theme.home.visual.altKey } : {})
        }
      }
    },
    search,
    ai,
    seo: {
      sitemap: config.seo?.sitemap ?? true,
      robots: config.seo?.robots ?? true,
      ...(config.seo?.defaultAuthor ? { defaultAuthor: config.seo.defaultAuthor } : {}),
      head: {
        meta: config.seo?.head?.meta ?? [],
        links: config.seo?.head?.links ?? [],
        jsonLd: config.seo?.head?.jsonLd ?? config.seo?.head?.jsonld ?? config.seo?.head?.['json-ld'] ?? []
      },
      ogImage:
        config.seo?.ogImage === false
          ? false
          : {
              template: config.seo?.ogImage?.template ?? 'default',
              format: config.seo?.ogImage?.format ?? 'svg',
              outDir: config.seo?.ogImage?.outDir ?? 'static/og',
              renderer: config.seo?.ogImage?.renderer ?? 'svg'
            }
    },
    source: {
      ...(config.source?.editBaseUrl ? { editBaseUrl: config.source.editBaseUrl } : {})
    },
    cloudflare: {
      compatibilityDate: config.cloudflare?.compatibilityDate ?? '2026-05-18',
      aiSearch: {
        binding: config.cloudflare?.aiSearch?.binding ?? 'SVEDOCS_AI_SEARCH',
        instanceName: config.cloudflare?.aiSearch?.instanceName ?? 'svedocs',
        ...(config.cloudflare?.aiSearch?.namespace ? { namespace: config.cloudflare.aiSearch.namespace } : {}),
        remote: config.cloudflare?.aiSearch?.remote ?? false
      }
    },
    checks: {
      assets: config.checks?.assets ?? true,
      externalLinks: config.checks?.externalLinks ?? false,
      translations: config.checks?.translations ?? false,
    },
    i18n: resolveSvedocsI18nConfig(config)
  };
}

function resolveCodeTheme(input: string | { light?: string; dark?: string } | undefined): SvedocsResolvedConfig['theme']['codeTheme'] {
  if (typeof input === 'string') {
    return {
      light: input,
      dark: input
    };
  }
  return {
    light: input?.light ?? 'github-light',
    dark: input?.dark ?? 'github-dark'
  };
}

export function isResolvedConfig(config: SvedocsConfig | SvedocsResolvedConfig | undefined): config is SvedocsResolvedConfig {
  const candidate = config as SvedocsResolvedConfig | undefined;
  return Boolean(
    candidate
      && Array.isArray(candidate.content?.include)
      && Array.isArray(candidate.content?.exclude)
      && typeof candidate.search?.enabled === 'boolean'
      && typeof candidate.ai?.enabled === 'boolean'
      && typeof candidate.theme?.fonts?.sans === 'string'
      && typeof candidate.theme?.brand?.label === 'string'
      && typeof candidate.cloudflare?.compatibilityDate === 'string'
  );
}
