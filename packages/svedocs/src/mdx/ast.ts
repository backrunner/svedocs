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
      offset?: number;
    };
    end?: { offset?: number };
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

/** Strip only a leading title node, never heading-like text inside code. */
export function prepareMarkdownTitle(markdown: string, explicitTitle?: string): { markdown: string; title?: string } {
  const nodes = parseMarkdownAst(markdown).children ?? [];
  const heading = nodes.find((node) => node.type === 'heading' && node.depth === 1);
  const title = explicitTitle ?? (heading ? nodeToText(heading).trim() : undefined);
  const leading = nodes.find((node) => !(node.type === 'html' && /^\s*<(script|style)\b/i.test(node.value ?? '')));
  const start = leading?.position?.start?.offset;
  const end = leading?.position?.end?.offset;
  const body = leading?.type === 'heading' && leading.depth === 1 && nodeToText(leading).trim() === title
    && start !== undefined && end !== undefined
    ? `${markdown.slice(0, start)}${markdown.slice(end)}`.trim()
    : markdown;
  return { markdown: body, ...(title ? { title } : {}) };
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

// Containers whose children are block-level: separate them with a space so plain
// text stays readable. Inline containers (headings, paragraphs, emphasis, cells, …)
// concatenate exactly like the hast text extraction rehype-slug sees.
const BLOCK_JOIN_CONTAINERS = new Set(['root', 'blockquote', 'list', 'listItem', 'footnoteDefinition', 'table', 'tableRow']);

function nodeToText(node: MarkdownNode | undefined): string {
  if (!node) return '';
  // Mirror the text extraction the rehype side (rehype-raw + rehype-slug) performs,
  // so outline/section ids always match the rendered heading ids:
  // - only raw `html` nodes have their tags stripped (inline code and text keep
  //   literal values like `init <path>`);
  // - inline children are concatenated without injecting spaces (text nodes already
  //   carry their own whitespace; adding more would produce extra hyphens in slugs).
  if (typeof node.value === 'string') return node.type === 'html' ? stripHtml(node.value) : node.value;
  if (node.type === 'image') return node.alt ?? '';
  if (!node.children?.length) return '';
  const separator = BLOCK_JOIN_CONTAINERS.has(node.type ?? '') ? ' ' : '';
  return node.children.map(nodeToText).filter(Boolean).join(separator);
}
