import type { SvedocsPage, SvedocsResolvedConfig } from '../core/types.js';
import { createAbsoluteUrl, createCanonicalUrl } from '../core/urls.js';
import { seoUpdatedTime } from '../core/seo.js';
import { resolveAuthorUrl } from './author.js';
import type { SvedocsPageMetadata } from './types.js';

type Node = Record<string, unknown>;
const context = 'https://schema.org';
const hasType = (node: Node, type: string) => [node['@type']].flat().includes(type);

/** Custom fields override generated fields; IDs, not types alone, identify entities. */
export function createStructuredData(config: SvedocsResolvedConfig, page: SvedocsPage,
  metadata: Pick<SvedocsPageMetadata, 'title' | 'description' | 'canonical' | 'image'>,
  customEntries: Node[], language: string): { page: Node; entities: Node[] } {
  const custom = flattenGraphs(customEntries);
  const siteUrl = config.site.url ? createAbsoluteUrl(config, config.site.url) : undefined;
  const siteBase = siteUrl ? siteUrl.split(/[?#]/)[0]!.replace(/\/?$/, '/') : undefined;
  const websiteId = siteBase ? `${siteBase}#website` : undefined;
  const organizationId = siteBase ? `${siteBase}#organization` : undefined;
  const website = custom.find((node) => hasType(node, 'WebSite') && (
    node['@id'] === websiteId || (typeof node.url === 'string' && sameSite(node.url, siteUrl))
  ));
  const organization = custom.find((node) => hasType(node, 'Organization') && (
    node['@id'] === organizationId || (typeof node.url === 'string' && sameSite(node.url, siteUrl))
    || (!node['@id'] && !node.url && node.name === config.seo.defaultAuthor && config.seo.defaultAuthorType === 'Organization')
  ));
  const publisherUrl = config.seo.defaultAuthorUrl ? createAbsoluteUrl(config, config.seo.defaultAuthorUrl) : undefined;
  const publisher = organization ?? (config.seo.defaultAuthor && config.seo.defaultAuthorType === 'Organization'
    ? { '@type': 'Organization', name: config.seo.defaultAuthor, ...(publisherUrl ? { url: publisherUrl } : {}) } : undefined);
  const resolvedWebsiteId = typeof website?.['@id'] === 'string' ? website['@id'] : websiteId;
  const resolvedPublisherId = typeof publisher?.['@id'] === 'string' ? publisher['@id'] : organizationId;
  const pageType = page.kind === 'doc' ? 'TechArticle' : 'WebPage';
  const pageId = metadata.canonical ? `${metadata.canonical}#${page.kind === 'doc' ? 'article' : 'webpage'}` : undefined;
  const customPage = custom.find((node) => hasType(node, pageType) && (
    node['@id'] === pageId || (typeof node.url === 'string' && createCanonicalUrl(config, node.url) === metadata.canonical)
  ));
  const resolvedPageId = typeof customPage?.['@id'] === 'string' ? customPage['@id'] : pageId;
  const siteNode: Node = {
    '@context': context, '@type': 'WebSite', name: config.site.name,
    ...(resolvedWebsiteId ? { '@id': resolvedWebsiteId } : {}),
    ...(siteUrl ? { url: siteUrl } : {}),
    inLanguage: language,
    ...(publisher ? { publisher: resolvedPublisherId ? { '@id': resolvedPublisherId } : publisher } : {})
  };
  const pageNode: Node = {
    '@context': context, '@type': pageType,
    ...(resolvedPageId ? { '@id': resolvedPageId } : {}),
    headline: metadata.title, description: metadata.description, inLanguage: language,
    isPartOf: resolvedWebsiteId ? { '@id': resolvedWebsiteId } : siteNode,
    ...(publisher ? { publisher: resolvedPublisherId ? { '@id': resolvedPublisherId } : publisher } : {}),
    ...(metadata.canonical ? { url: metadata.canonical } : {}),
    ...(metadata.image ? { image: metadata.image } : {})
  };
  const author = page.seo.author ?? config.seo.defaultAuthor;
  if (author) {
    const authorType = page.seo.authorType ?? config.seo.defaultAuthorType ?? 'Person';
    const url = resolveAuthorUrl(config, page);
    pageNode.author = authorType === 'Organization' && publisher?.name === author && resolvedPublisherId
      ? { '@id': resolvedPublisherId } : { '@type': authorType, name: author, ...(url ? { url } : {}) };
  }
  if (page.seo.publishedTime) pageNode.datePublished = page.seo.publishedTime;
  const updated = seoUpdatedTime(page);
  if (updated) pageNode.dateModified = updated;
  if (page.kind === 'doc') { pageNode.position = page.order; pageNode.about = page.headings.map((heading) => heading.text); }

  const nodes: Node[] = [pageNode];
  if (resolvedWebsiteId) nodes.push(siteNode);
  if (publisher && resolvedPublisherId) nodes.push({ '@context': context, '@id': resolvedPublisherId, ...publisher });
  const byId = new Map<string, number>();
  const merged: Node[] = [];
  const seen = new Set<string>();
  for (const node of [...nodes, ...custom.map((entry) => ({
    ...entry,
    ...(resolvedWebsiteId && (entry === website || (!entry['@id'] && hasType(entry, 'WebSite') && typeof entry.url === 'string' && sameSite(entry.url, siteUrl))) ? { '@id': resolvedWebsiteId } : {}),
    ...(resolvedPublisherId && (entry === organization || (!entry['@id'] && hasType(entry, 'Organization') && typeof entry.url === 'string' && sameSite(entry.url, siteUrl))) ? { '@id': resolvedPublisherId } : {}),
    ...(resolvedPageId && (entry === customPage || (!entry['@id'] && hasType(entry, pageType) && typeof entry.url === 'string' && createCanonicalUrl(config, entry.url) === metadata.canonical)) ? { '@id': resolvedPageId, url: metadata.canonical } : {})
  }))]) {
    const id = typeof node['@id'] === 'string' ? node['@id'] : undefined;
    const existing = id ? byId.get(id) : undefined;
    if (existing !== undefined) merged[existing] = { ...merged[existing], ...node };
    else {
      const key = stableJson(node);
      if (!id && seen.has(key)) continue;
      seen.add(key);
      if (id) byId.set(id, merged.length);
      merged.push(node);
    }
  }
  return { page: merged[0]!, entities: merged.slice(1) };
}

function sameSite(value: string, siteUrl: string | undefined): boolean {
  if (!siteUrl) return false;
  try { return new URL(value).href.replace(/\/$/, '') === siteUrl.replace(/\/$/, ''); }
  catch { return false; }
}

/** Anonymous graphs are containers; named graphs retain their graph semantics. */
function flattenGraphs(entries: Node[], inheritedContext: unknown = context): Node[] {
  return entries.flatMap((entry) => {
    const ownContext = Object.hasOwn(entry, '@context') ? entry['@context'] : inheritedContext;
    if (Array.isArray(entry['@graph']) && Object.keys(entry).every((key) => key === '@graph' || key === '@context')) {
      return flattenGraphs(entry['@graph'].filter((node): node is Node => Boolean(node) && typeof node === 'object' && !Array.isArray(node)), ownContext);
    }
    return [{ '@context': ownContext, ...entry }];
  });
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
