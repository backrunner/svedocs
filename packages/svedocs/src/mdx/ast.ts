import GithubSlugger from 'github-slugger';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { SvedocsHeading, SvedocsLinkReference } from '../core/types.js';
import { stripHtml } from '../core/utils.js';

interface MarkdownNode {
  type: string;
  value?: string;
  alt?: string;
  url?: string;
  identifier?: string;
  label?: string;
  children?: MarkdownNode[];
  depth?: number;
  position?: {
    start?: {
      line?: number;
    };
  };
}

export interface MarkdownSection {
  id: string;
  depth: 2 | 3 | 4;
  title: string;
  content: string;
}

export function parseMarkdownAst(markdown: string): MarkdownNode {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .parse(markdown) as MarkdownNode;
}

export function extractMarkdownOutline(markdown: string): { title?: string; headings: SvedocsHeading[] } {
  const tree = parseMarkdownAst(markdown);
  const slugger = new GithubSlugger();
  const headings: SvedocsHeading[] = [];
  let title: string | undefined;

  visit(tree as never, 'heading', (node: MarkdownNode) => {
    const depth = node.depth ?? 0;
    const text = nodeToText(node).trim();
    if (!text) return;
    const id = slugger.slug(text);
    if (depth === 1 && !title) title = text;
    if (depth >= 2 && depth <= 4) {
      headings.push({ id, depth: depth as 2 | 3 | 4, text });
    }
  });

  return { ...(title ? { title } : {}), headings };
}

export function markdownAstToPlainText(markdown: string): string {
  return nodeToText(parseMarkdownAst(markdown)).replace(/\s+/g, ' ').trim();
}

export function extractMarkdownSections(markdown: string): MarkdownSection[] {
  const tree = parseMarkdownAst(markdown);
  const slugger = new GithubSlugger();
  const sections: MarkdownSection[] = [];
  let current: { id: string; depth: 2 | 3 | 4; title: string; nodes: MarkdownNode[] } | undefined;

  function flush() {
    if (!current) return;
    const content = current.nodes.map(nodeToText).join(' ').replace(/\s+/g, ' ').trim();
    if (content.length >= 8) {
      sections.push({
        id: current.id,
        depth: current.depth,
        title: current.title,
        content
      });
    }
    current = undefined;
  }

  for (const node of tree.children ?? []) {
    if (node.type === 'heading' && typeof node.depth === 'number') {
      const text = nodeToText(node).trim();
      if (text) {
        const id = slugger.slug(text);
        if (node.depth >= 2 && node.depth <= 4) {
          flush();
          current = { id, depth: node.depth as 2 | 3 | 4, title: text, nodes: [] };
          continue;
        }
      }
    }
    current?.nodes.push(node);
  }

  flush();
  return sections;
}

export function extractMarkdownLinksFromAst(markdown: string): SvedocsLinkReference[] {
  const tree = parseMarkdownAst(markdown);
  const definitions = new Map<string, string>();
  const links: SvedocsLinkReference[] = [];

  visit(tree as never, 'definition', (node: MarkdownNode) => {
    if (node.identifier && node.url) definitions.set(node.identifier.toLowerCase(), node.url);
  });

  visit(tree as never, (node: MarkdownNode) => {
    if (node.type === 'link' && node.url) {
      links.push(createLinkReference(node.url, nodeToText(node), 'link', node));
    }
    if (node.type === 'image' && node.url) {
      links.push(createLinkReference(node.url, node.alt ?? node.url, 'image', node));
    }
    if ((node.type === 'linkReference' || node.type === 'imageReference') && node.identifier) {
      const href = definitions.get(node.identifier.toLowerCase());
      if (href) {
        links.push(createLinkReference(href, nodeToText(node) || node.label || href, node.type === 'imageReference' ? 'image' : 'link', node));
      }
    }
    if (node.type === 'html' && node.value) {
      links.push(...extractHtmlLinks(node.value, node.position?.start?.line ?? 1));
    }
  });

  return links;
}

function createLinkReference(
  href: string,
  text: string,
  source: 'link' | 'image',
  node: MarkdownNode
): SvedocsLinkReference {
  return {
    href,
    text: text || href,
    kind: source === 'image' ? 'asset' : classifyHref(href),
    line: node.position?.start?.line ?? 1
  };
}

function extractHtmlLinks(html: string, line: number): SvedocsLinkReference[] {
  const links: SvedocsLinkReference[] = [];
  const pattern = /<a\s+[^>]*href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gis;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const href = match[2];
    if (!href) continue;
    links.push({
      href,
      text: stripHtml(match[3] ?? href),
      kind: classifyHref(href),
      line
    });
  }
  return links;
}

function classifyHref(href: string): SvedocsLinkReference['kind'] {
  if (href.startsWith('#')) return 'anchor';
  if (href.startsWith('mailto:')) return 'mailto';
  if (href.startsWith('tel:')) return 'tel';
  if (/^(https?:)?\/\//.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href)) return 'external';
  if (/\.(avif|gif|jpe?g|png|svg|webp|pdf|zip)([#?].*)?$/i.test(href)) return 'asset';
  return 'internal';
}

function nodeToText(node: MarkdownNode | undefined): string {
  if (!node) return '';
  if (typeof node.value === 'string') return stripHtml(node.value);
  if (node.type === 'image') return node.alt ?? '';
  if (!node.children?.length) return '';
  return node.children.map(nodeToText).filter(Boolean).join(' ');
}
