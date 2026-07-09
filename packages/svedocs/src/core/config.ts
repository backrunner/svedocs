import type { SvedocsConfig } from '../config.js';
import type { SvedocsLocale, SvedocsMessages, SvedocsResolvedConfig } from './types.js';

export const defaultSvedocsMessages = {
  'nav.primary': 'Primary',
  'nav.docs': 'Docs',
  'nav.configuration': 'Configuration',
  'nav.api': 'API',
  'nav.documentation': 'Documentation',
  'nav.footer': 'Footer',
  'nav.social': 'Social links',
  'nav.mobile.open': 'Open menu',
  'nav.mobile.close': 'Close menu',
  'nav.skipToContent': 'Skip to content',
  'scope.group': 'Documentation scope',
  'scope.locale': 'Locale',
  'scope.localeOptions': 'Locale options',
  'scope.langShort': 'Lang',
  'search.trigger': 'Search',
  'search.dialog': 'Search documentation',
  'search.query': 'Search query',
  'search.placeholder': 'Search docs',
  'search.results': 'Search results',
  'search.loading': 'Searching...',
  'search.loadingIndex': 'Loading search index...',
  'search.indexError': 'Search index could not be loaded.',
  'search.remoteFallback': '{error} Showing local results.',
  'search.empty': 'No matching docs yet.',
  'search.fetchUnavailable': 'Fetch is not available.',
  'search.requestError': 'Search returned {status}.',
  'search.failed': 'Search failed.',
  'ask.label': 'Ask AI',
  'ask.placeholder': 'Ask about the docs',
  'ask.welcome': '',
  'ask.empty': 'Ask anything about these docs.',
  'ask.newChat': 'New chat',
  'ask.close': 'Close',
  'ask.thinking': 'Thinking',
  'ask.send': 'Send',
  'ask.suggestion.1': '',
  'ask.suggestion.2': '',
  'ask.suggestion.3': '',
  'ask.fetchUnavailable': 'Fetch is not available.',
  'ask.requestError': 'Ask AI returned {status}.',
  'ask.failed': 'Ask AI failed.',
  'ask.streamUnreadable': 'Ask AI returned an unreadable stream event.',
  'ask.localSource': 'I found 1 relevant source in this documentation.',
  'ask.localSources': 'I found {count} relevant sources in this documentation.',
  'ask.localEmpty': 'I could not find a matching local source for that question.',
  'ask.fallbackSource': 'I found 1 relevant source. Connect the {provider} provider to replace this local draft with a hosted Ask AI response.',
  'ask.fallbackSources': 'I found {count} relevant sources. Connect the {provider} provider to replace this local draft with a hosted Ask AI response.',
  'ask.fallbackReady': 'Ask AI is ready. Connect {provider} and index your docs to answer this question with citations.',
  'ask.sourceTitle': 'Source {index}',
  'toc.label': 'On this page',
  'article.kind.doc': 'Documentation',
  'article.kind.page': 'Page',
  'article.breadcrumb': 'Breadcrumb',
  'article.updated': 'Updated {date}',
  'article.edit': 'Edit this page',
  'article.previous': 'Previous',
  'article.next': 'Next',
  'code.copy': 'Copy code',
  'code.copied': 'Copied',
  'code.copyDiff': 'Copy diff',
  'diff.label': 'Diff',
  'diff.aria': '{title} diff',
  'diff.before': 'Before',
  'diff.after': 'After',
  'tools.label': 'Page tools',
  'tools.backToTop': 'Back to top',
  'theme.switch': 'Switch to {mode} theme',
  'theme.light': 'light',
  'theme.dark': 'dark',
  'home.kicker': 'SvelteKit-native docs',
  'home.primaryAction': 'Read docs',
  'home.features': 'Documentation entry points',
  'home.card.start.label': 'Start',
  'home.card.start.title': 'Quick Start',
  'home.card.start.description': 'Get a site running, open the docs route, and move straight into the installed docs tree.',
  'home.card.install.label': 'Install',
  'home.card.install.title': 'Manual Installation',
  'home.card.install.description': 'Add svedocs to an existing SvelteKit app and wire the Vite plugin plus theme styles.',
  'home.card.write.label': 'Write',
  'home.card.write.title': 'Writing',
  'home.card.write.description': 'Use Markdown, frontmatter, and Svelte components in one content tree.',
  'home.card.integrate.label': 'Integrate',
  'home.card.integrate.title': 'Integrations',
  'home.card.integrate.description': 'Add search, Ask AI, Cloudflare deployment, SEO, and OG assets when the content is ready.',
  'footer.text': 'MIT licensed. Built with {site}.',
  'error.notFound.title': 'Page not found',
  'error.notFound.description': 'The page you are looking for is not in this documentation set.',
  'error.generic.title': 'Something went wrong',
  'error.generic.description': 'The docs shell is still available while this page recovers.',
  'error.status': 'Error {status}',
  'error.home': 'Home',
  'error.docs': 'Docs',
  'render.label': 'Rendering issue',
  'render.title': 'This section could not render',
  'render.message': 'Something in this part of the documentation failed while rendering. The rest of the page is still available.',
  'render.details': 'Technical details',
  'render.tryAgain': 'Try again',
  'render.reload': 'Reload page',
  'render.docsHome': 'Docs home',
  'render.layout.label': 'Layout issue',
  'render.layout.title': 'The page layout could not render',
  'render.layout.message': 'A layout component failed while rendering. The default site shell is still available.',
  'render.header.label': 'Header issue',
  'render.header.title': 'Header could not render',
  'render.header.message': 'The page is still available below. You can retry the header or use links inside the content.',
  'render.ask.label': 'Ask AI issue',
  'render.ask.title': 'Ask AI could not render',
  'render.ask.message': 'The article is still available. Retry Ask AI when you need it.',
  'render.tools.label': 'Page tools issue',
  'render.tools.title': 'Page tools could not render',
  'render.tools.message': 'The page tools failed to render. The document content is unaffected.',
  'render.footer.label': 'Footer issue',
  'render.footer.title': 'Footer could not render',
  'render.footer.message': 'Footer links failed to render. The page content above is still available.',
  'render.page.label': 'Page rendering issue',
  'render.page.title': 'This page could not render',
  'render.page.message': 'The page content failed while rendering. You can retry this section or reload the page.',
  'render.article.label': 'Article rendering issue',
  'render.article.title': 'This article could not render',
  'render.article.message': 'The article content failed while rendering. Navigation and page tools are still available.',
  'render.docs.label': 'Documentation layout issue',
  'render.docs.title': 'This documentation layout could not render',
  'render.docs.message': 'A layout component failed while rendering. Retry the section, or use the top navigation to continue.',
  'render.home.label': 'Home content issue',
  'render.home.title': 'Home content could not render',
  'render.home.message': 'The home page content failed while rendering. The rest of the site is still available.',
  'render.error.label': 'Error page issue',
  'render.error.title': 'The error page could not render',
  'render.error.message': 'A custom error page component failed while rendering. The default site shell is still available.',
  'render.custom.label': 'Custom layout issue',
  'render.custom.title': 'The custom layout could not render',
  'render.custom.message': 'A custom page layout failed while rendering. The route is still loaded; retry after fixing the component.',
  'render.navigation.label': 'Navigation issue',
  'render.navigation.title': 'Navigation could not render',
  'render.navigation.message': 'The page content is still available. You can retry the navigation area or use the top navigation.',
  'render.outline.label': 'Outline issue',
  'render.outline.title': 'Outline could not render',
  'render.outline.message': 'The table of contents failed to render, but the article is still available.',
  'render.errorUi.label': 'Error boundary issue',
  'render.errorUi.title': 'Error UI could not render',
  'render.errorUi.message': 'A custom error component failed while rendering. The default recovery UI is shown instead.'
} satisfies SvedocsMessages;

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
        href: config.theme?.brand?.href ?? '/',
        ...(config.theme?.brand?.logo ? { logo: config.theme.brand.logo } : {}),
        mark: config.theme?.brand?.mark ?? 'pixel'
      },
      nav: config.theme?.nav ?? [
        { label: 'Docs', href: '/docs' }
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
        ...(config.theme?.home?.primaryAction ? { primaryAction: config.theme.home.primaryAction } : {}),
        ...(config.theme?.home?.secondaryAction ? { secondaryAction: config.theme.home.secondaryAction } : {}),
        visual: {
          type: config.theme?.home?.visual?.type ?? 'pixel',
          ...(config.theme?.home?.visual?.src ? { src: config.theme.home.visual.src } : {}),
          alt: config.theme?.home?.visual?.alt ?? ''
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
    i18n: resolveI18nConfig(config)
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

function resolveI18nConfig(config: SvedocsConfig): SvedocsResolvedConfig['i18n'] {
  const baseMessages = createBaseMessages(config);
  if (config.i18n === false) {
    return {
      locales: [],
      prefixDefaultLocale: false,
      messages: {
        en: baseMessages
      }
    };
  }
  const locales = (config.i18n?.locales ?? []).map(normalizeLocale);
  const defaultLocale = config.i18n?.defaultLocale ?? locales[0]?.code;
  return {
    ...(defaultLocale ? { defaultLocale } : {}),
    locales,
    prefixDefaultLocale: config.i18n?.prefixDefaultLocale ?? false,
    messages: resolveI18nMessages(locales, defaultLocale, baseMessages, config.i18n?.messages)
  };
}

function normalizeLocale(locale: string | { code: string; label?: string; path?: string; hreflang?: string; dir?: 'ltr' | 'rtl' }): SvedocsLocale {
  if (typeof locale === 'string') {
    return {
      code: locale,
      label: locale,
      path: locale
    };
  }
  return {
    code: locale.code,
    label: locale.label ?? locale.code,
    path: locale.path ?? locale.code,
    ...(locale.hreflang ? { hreflang: locale.hreflang } : {}),
    ...(locale.dir ? { dir: locale.dir } : {})
  };
}

function resolveI18nMessages(
  locales: SvedocsLocale[],
  defaultLocale: string | undefined,
  baseMessages: SvedocsMessages,
  messages: Record<string, Partial<SvedocsMessages>> | undefined
): Record<string, SvedocsMessages> {
  const base = mergeMessages(baseMessages, messages?.en);
  const codes = new Set<string>(['en']);
  if (defaultLocale) codes.add(defaultLocale);
  for (const locale of locales) codes.add(locale.code);
  for (const code of Object.keys(messages ?? {})) codes.add(code);

  const resolved: Record<string, SvedocsMessages> = {};
  for (const code of codes) {
    resolved[code] = code === 'en'
      ? base
      : mergeMessages(base, messages?.[code]);
  }
  return resolved;
}

function mergeMessages(base: SvedocsMessages, override: Partial<SvedocsMessages> | undefined): SvedocsMessages {
  return {
    ...base,
    ...(override ?? {})
  };
}

function createBaseMessages(config: SvedocsConfig): SvedocsMessages {
  const ai = config.ai === false ? undefined : config.ai;
  const footerText = config.theme?.footer === false ? undefined : config.theme?.footer?.text;
  return mergeMessages(defaultSvedocsMessages, {
    ...(footerText ? { 'footer.text': footerText } : {}),
    ...(ai?.label ? { 'ask.label': ai.label } : {}),
    ...(ai?.placeholder ? { 'ask.placeholder': ai.placeholder } : {}),
    ...(ai?.welcomeMessage ? { 'ask.welcome': ai.welcomeMessage } : {}),
    ...(ai?.suggestions?.[0] ? { 'ask.suggestion.1': ai.suggestions[0] } : {}),
    ...(ai?.suggestions?.[1] ? { 'ask.suggestion.2': ai.suggestions[1] } : {}),
    ...(ai?.suggestions?.[2] ? { 'ask.suggestion.3': ai.suggestions[2] } : {})
  });
}
