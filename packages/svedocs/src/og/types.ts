export interface OgImageInput {
  title: string;
  description?: string;
  siteName?: string;
}

export type OgRenderer = 'svg' | 'satori';

export interface OgFont {
  name: string;
  data: ArrayBuffer | Uint8Array;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: 'normal' | 'italic';
}

export interface OgTemplateNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: string | OgTemplateNode | OgTemplateNode[];
    [key: string]: unknown;
  };
}

export type OgTemplate = (input: OgImageInput) => OgTemplateNode;

export interface OgRenderOptions {
  renderer?: OgRenderer;
  fonts?: OgFont[];
  template?: OgTemplate;
}

export interface OgImageOptions extends OgRenderOptions {
  format?: 'svg' | 'png';
}

export interface SvedocsPageMetadata {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
    openGraph: {
      title: string;
      description: string;
      type: string;
      url?: string;
      image?: string;
      siteName: string;
      author?: string;
      publishedTime?: string;
      updatedTime?: string;
    };
  twitter: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    image?: string;
  };
  jsonLd: Record<string, unknown>;
}

export interface SvedocsPageAlternate {
  lang: string;
  href: string;
  locale?: string;
}
