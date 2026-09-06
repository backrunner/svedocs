import { stringFrontmatter } from './utils.js';
import type { SvedocsSeoHead, SvedocsSeoJsonLd, SvedocsSeoLinkTag, SvedocsSeoMetaTag } from './types.js';

export function normalizeSeoHead(value: unknown): SvedocsSeoHead | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const meta = Array.isArray(input.meta) ? input.meta.map(normalizeSeoMetaTag).filter((tag): tag is SvedocsSeoMetaTag => Boolean(tag)) : [];
  const links = Array.isArray(input.links) ? input.links.map(normalizeSeoLinkTag).filter((tag): tag is SvedocsSeoLinkTag => Boolean(tag)) : [];
  const jsonLdInput = input.jsonLd ?? input.jsonld ?? input['json-ld'];
  const jsonLd = Array.isArray(jsonLdInput) ? jsonLdInput.map(normalizeSeoJsonLd).filter((tag): tag is SvedocsSeoJsonLd => Boolean(tag)) : [];
  if (meta.length === 0 && links.length === 0 && jsonLd.length === 0) return undefined;
  return {
    ...(meta.length > 0 ? { meta } : {}),
    ...(links.length > 0 ? { links } : {}),
    ...(jsonLd.length > 0 ? { jsonLd } : {})
  };
}

function normalizeSeoMetaTag(value: unknown): SvedocsSeoMetaTag | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const content = stringFrontmatter(input.content);
  if (!content) return undefined;
  const tag: SvedocsSeoMetaTag = { content };
  const name = stringFrontmatter(input.name);
  const property = stringFrontmatter(input.property);
  const httpEquiv = stringFrontmatter(input.httpEquiv) ?? stringFrontmatter(input['http-equiv']);
  const itemprop = stringFrontmatter(input.itemprop);
  if (name) tag.name = name;
  if (property) tag.property = property;
  if (httpEquiv) tag.httpEquiv = httpEquiv;
  if (itemprop) tag.itemprop = itemprop;
  return tag.name || tag.property || tag.httpEquiv || tag.itemprop ? tag : undefined;
}

function normalizeSeoLinkTag(value: unknown): SvedocsSeoLinkTag | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const rel = stringFrontmatter(input.rel);
  const href = stringFrontmatter(input.href);
  if (!rel || !href) return undefined;
  const tag: SvedocsSeoLinkTag = { rel, href };
  const hreflang = stringFrontmatter(input.hreflang);
  const type = stringFrontmatter(input.type);
  const media = stringFrontmatter(input.media);
  const title = stringFrontmatter(input.title);
  const sizes = stringFrontmatter(input.sizes);
  const as = stringFrontmatter(input.as);
  const crossorigin = stringFrontmatter(input.crossorigin);
  if (hreflang) tag.hreflang = hreflang;
  if (type) tag.type = type;
  if (media) tag.media = media;
  if (title) tag.title = title;
  if (sizes) tag.sizes = sizes;
  if (as) tag.as = as;
  if (crossorigin) tag.crossorigin = crossorigin;
  return tag;
}

function normalizeSeoJsonLd(value: unknown): SvedocsSeoJsonLd | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as SvedocsSeoJsonLd : undefined;
}

