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
}

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
