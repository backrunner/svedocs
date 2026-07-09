export interface SvedocsSeoMetaTag {
  name?: string;
  property?: string;
  httpEquiv?: string;
  itemprop?: string;
  content: string;
}

export interface SvedocsSeoLinkTag {
  rel: string;
  href: string;
  hreflang?: string;
  type?: string;
  media?: string;
  title?: string;
  sizes?: string;
  as?: string;
  crossorigin?: string;
}

export type SvedocsSeoJsonLd = Record<string, unknown>;

export interface SvedocsSeoHead {
  meta?: SvedocsSeoMetaTag[];
  links?: SvedocsSeoLinkTag[];
  jsonLd?: SvedocsSeoJsonLd[];
  jsonld?: SvedocsSeoJsonLd[];
  'json-ld'?: SvedocsSeoJsonLd[];
}

export interface SvedocsResolvedSeoHead {
  meta: SvedocsSeoMetaTag[];
  links: SvedocsSeoLinkTag[];
  jsonLd: SvedocsSeoJsonLd[];
}

export interface SvedocsSeo {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  keywords?: string[];
  type?: string;
  author?: string;
  publishedTime?: string;
  updatedTime?: string;
  robots?: string;
  head?: SvedocsSeoHead;
}

export interface SvedocsHeading {
  id: string;
  depth: 2 | 3 | 4;
  text: string;
}

export interface SvedocsCodeBlock {
  id: string;
  language: string;
  raw: string;
  meta: string;
  title?: string;
  highlightLines: number[];
  focusLines: number[];
  diff: boolean;
  diffMode?: 'unified' | 'split';
  diffRows: SvedocsDiffRow[];
  splitRows: SvedocsDiffSplitRow[];
  addedLines: number;
  removedLines: number;
  noLineNumbers?: boolean;
  wrap?: boolean;
}

export interface SvedocsDiffRow {
  oldLine?: number;
  newLine?: number;
  kind: 'context' | 'add' | 'remove' | 'meta';
  content: string;
}

export interface SvedocsDiffSplitRow {
  kind: 'context' | 'change' | 'meta';
  old?: SvedocsDiffRow;
  new?: SvedocsDiffRow;
  content?: string;
}

export interface SvedocsLocale {
  code: string;
  label: string;
  path: string;
  hreflang?: string;
  dir?: 'ltr' | 'rtl';
}

export interface SvedocsMessages {
  'nav.primary': string;
  'nav.docs': string;
  'nav.configuration': string;
  'nav.api': string;
  'nav.documentation': string;
  'nav.footer': string;
  'nav.social': string;
  'nav.mobile.open': string;
  'nav.mobile.close': string;
  'nav.skipToContent': string;
  'scope.group': string;
  'scope.locale': string;
  'scope.localeOptions': string;
  'scope.langShort': string;
  'search.trigger': string;
  'search.dialog': string;
  'search.query': string;
  'search.placeholder': string;
  'search.results': string;
  'search.loading': string;
  'search.loadingIndex': string;
  'search.indexError': string;
  'search.remoteFallback': string;
  'search.empty': string;
  'search.fetchUnavailable': string;
  'search.requestError': string;
  'search.failed': string;
  'ask.label': string;
  'ask.placeholder': string;
  'ask.welcome': string;
  'ask.empty': string;
  'ask.newChat': string;
  'ask.close': string;
  'ask.thinking': string;
  'ask.send': string;
  'ask.suggestion.1': string;
  'ask.suggestion.2': string;
  'ask.suggestion.3': string;
  'ask.fetchUnavailable': string;
  'ask.requestError': string;
  'ask.failed': string;
  'ask.streamUnreadable': string;
  'ask.localSource': string;
  'ask.localSources': string;
  'ask.localEmpty': string;
  'ask.fallbackSource': string;
  'ask.fallbackSources': string;
  'ask.fallbackReady': string;
  'ask.sourceTitle': string;
  'toc.label': string;
  'article.kind.doc': string;
  'article.kind.page': string;
  'article.breadcrumb': string;
  'article.updated': string;
  'article.edit': string;
  'article.previous': string;
  'article.next': string;
  'code.copy': string;
  'code.copied': string;
  'code.copyDiff': string;
  'diff.label': string;
  'diff.aria': string;
  'diff.before': string;
  'diff.after': string;
  'tools.label': string;
  'tools.backToTop': string;
  'theme.switch': string;
  'theme.light': string;
  'theme.dark': string;
  'home.kicker': string;
  'home.primaryAction': string;
  'home.features': string;
  'home.card.start.label': string;
  'home.card.start.title': string;
  'home.card.start.description': string;
  'home.card.install.label': string;
  'home.card.install.title': string;
  'home.card.install.description': string;
  'home.card.write.label': string;
  'home.card.write.title': string;
  'home.card.write.description': string;
  'home.card.integrate.label': string;
  'home.card.integrate.title': string;
  'home.card.integrate.description': string;
  'footer.text': string;
  'error.notFound.title': string;
  'error.notFound.description': string;
  'error.generic.title': string;
  'error.generic.description': string;
  'error.status': string;
  'error.home': string;
  'error.docs': string;
  'render.label': string;
  'render.title': string;
  'render.message': string;
  'render.details': string;
  'render.tryAgain': string;
  'render.reload': string;
  'render.docsHome': string;
  'render.layout.label': string;
  'render.layout.title': string;
  'render.layout.message': string;
  'render.header.label': string;
  'render.header.title': string;
  'render.header.message': string;
  'render.ask.label': string;
  'render.ask.title': string;
  'render.ask.message': string;
  'render.tools.label': string;
  'render.tools.title': string;
  'render.tools.message': string;
  'render.footer.label': string;
  'render.footer.title': string;
  'render.footer.message': string;
  'render.page.label': string;
  'render.page.title': string;
  'render.page.message': string;
  'render.article.label': string;
  'render.article.title': string;
  'render.article.message': string;
  'render.docs.label': string;
  'render.docs.title': string;
  'render.docs.message': string;
  'render.home.label': string;
  'render.home.title': string;
  'render.home.message': string;
  'render.error.label': string;
  'render.error.title': string;
  'render.error.message': string;
  'render.custom.label': string;
  'render.custom.title': string;
  'render.custom.message': string;
  'render.navigation.label': string;
  'render.navigation.title': string;
  'render.navigation.message': string;
  'render.outline.label': string;
  'render.outline.title': string;
  'render.outline.message': string;
  'render.errorUi.label': string;
  'render.errorUi.title': string;
  'render.errorUi.message': string;
}

export type SvedocsMessageKey = keyof SvedocsMessages;
export type SvedocsTranslate = (key: SvedocsMessageKey, values?: Record<string, string | number>) => string;

export interface SvedocsLink {
  title: string;
  path: string;
}

export interface SvedocsLinkReference {
  href: string;
  text: string;
  kind: 'internal' | 'external' | 'anchor' | 'asset' | 'mailto' | 'tel';
  line: number;
}

export interface SvedocsSearchRecord {
  id: string;
  pageId: string;
  url: string;
  title: string;
  section?: string;
  content: string;
  metadata: Record<string, string | number | boolean | string[]>;
}

export interface SvedocsPage {
  id: string;
  sourcePath: string;
  routePath: string;
  scopePath: string;
  slug: string[];
  locale?: string;
  kind: 'doc' | 'page';
  title: string;
  navTitle?: string;
  description?: string;
  order?: number;
  hidden?: boolean;
  collapsed?: boolean;
  section?: boolean;
  icon?: string;
  html: string;
  plainText: string;
  headings: SvedocsHeading[];
  links: SvedocsLinkReference[];
  codeBlocks: SvedocsCodeBlock[];
  frontmatter: Record<string, unknown>;
  seo: SvedocsSeo;
  search: SvedocsSearchRecord[];
  prev?: SvedocsLink;
  next?: SvedocsLink;
  editUrl?: string;
  lastUpdated?: string;
}

export interface SvedocsTreeItem {
  id: string;
  title: string;
  path?: string;
  children?: SvedocsTreeItem[];
  collapsed?: boolean;
  order?: number;
  section?: boolean;
  icon?: string;
}

export interface SvedocsOgTemplateNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: string | SvedocsOgTemplateNode | SvedocsOgTemplateNode[];
    [key: string]: unknown;
  };
}

export type SvedocsOgTemplate = (input: {
  title: string;
  description?: string;
  siteName?: string;
}) => SvedocsOgTemplateNode;

export interface SvedocsResolvedConfig {
  site: {
    name: string;
    title: string;
    description: string;
    url?: string;
  };
  content: {
    root: string;
    docs: string;
    pages: string;
    include: string[];
    exclude: string[];
  };
  build: {
    mode: 'edge' | 'static' | 'spa';
  };
  theme: {
    defaultMode: 'light' | 'dark' | 'system';
    palette: {
      accent: string;
      neutral: string;
    };
    fonts: {
      sans: string;
      mono: string;
      display: string;
    };
    radius: string;
    codeTheme: {
      light: string;
      dark: string;
    };
    code: {
      lineNumbers: boolean;
      wrap: boolean;
      copyButton: boolean;
    };
    brand: {
      label: string;
      href: string;
      logo?: string;
      mark: 'pixel' | false;
    };
    nav: Array<{
      label: string;
      href: string;
      external?: boolean;
    }>;
    social: Array<{
      label: string;
      href: string;
      external?: boolean;
    }>;
    footer: false | {
      text: string;
      links: Array<{
        label: string;
        href: string;
        external?: boolean;
      }>;
    };
    home: {
      kicker: string;
      primaryAction?: {
        label: string;
        href: string;
      };
      secondaryAction?: {
        label: string;
        href: string;
      };
      visual: {
        type: 'pixel' | 'image';
        src?: string;
        alt: string;
      };
    };
  };
  search: {
    enabled: boolean;
    provider: string;
    scope: 'current' | 'all';
  };
  ai: {
    enabled: boolean;
    provider: string;
    scope: 'current' | 'all';
    label: string;
    placeholder: string;
    suggestions: string[];
    maxResults: number;
    systemPrompt?: string;
    welcomeMessage?: string;
  };
  seo: {
    sitemap: boolean;
    robots: boolean;
    defaultAuthor?: string;
    head: SvedocsResolvedSeoHead;
    ogImage: false | {
      template: string | SvedocsOgTemplate;
      format: 'svg' | 'png';
      outDir: string;
      renderer: 'svg' | 'satori';
    };
  };
  source: {
    editBaseUrl?: string;
  };
  cloudflare: {
    compatibilityDate: string;
    aiSearch: {
      binding: string;
      instanceName: string;
      namespace?: string;
      remote: boolean;
    };
  };
  checks: {
    assets: boolean;
    externalLinks: boolean;
    translations: boolean;
  };
  i18n: {
    defaultLocale?: string;
    locales: SvedocsLocale[];
    prefixDefaultLocale: boolean;
    messages: Record<string, SvedocsMessages>;
  };
}

export interface SvedocsContentIssue {
  code:
    | 'missing-description'
    | 'duplicate-route'
    | 'duplicate-canonical'
    | 'broken-link'
    | 'broken-anchor'
    | 'broken-asset'
    | 'external-link-unchecked'
    | 'missing-translation'
    | 'spa-risk'
    | 'empty-search'
    | 'package-bin-missing'
    | 'package-export-missing'
    | 'package-file-missing'
    | 'package-license-missing'
    | 'package-publish-access-missing'
    | 'package-provenance-missing';
  severity: 'error' | 'warning' | 'info';
  message: string;
  pageId?: string;
  sourcePath?: string;
  href?: string;
}

export interface SvedocsContentManifest {
  config: SvedocsResolvedConfig;
  pages: SvedocsPage[];
  tree: SvedocsTreeItem[];
  search: SvedocsSearchRecord[];
  issues: SvedocsContentIssue[];
}

export const svedocsPackage = {
  name: 'svedocs',
  version: '0.0.0'
} as const;
