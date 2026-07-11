import { visit } from 'unist-util-visit';
import { mergeClassNames } from './utils.js';

const externalLinkIcon = {
  type: 'element',
  tagName: 'svg',
  properties: {
    className: ['sd-external-link-icon'],
    viewBox: '0 0 24 24',
    ariaHidden: 'true',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  },
  children: [
    { type: 'element', tagName: 'path', properties: { d: 'M7 17L17 7' }, children: [] },
    { type: 'element', tagName: 'path', properties: { d: 'M9 7h8v8' }, children: [] },
    { type: 'element', tagName: 'path', properties: { d: 'M13 17H7V7' }, children: [] }
  ]
};

export function rehypeSvedocsLinks(options: { resolveHref?: (href: string) => string } = {}) {
  return (tree: unknown) => {
    visit(tree as any, 'element', (node: any, index: number | undefined, parent: any) => {
      if (node.tagName !== 'a') return;
      const originalHref = typeof node.properties?.href === 'string' ? node.properties.href : '';
      const href = originalHref ? options.resolveHref?.(originalHref) ?? originalHref : '';
      if (!href) return;
      if (href !== originalHref) node.properties.href = href;

      if (isInternalHref(href) && shouldRenderAsLinkCard(node, parent)) {
        const label = nodeToText(node).trim() || href;
        const description = parseCardDescription(node.properties?.title);
        const { title: _title, ...properties } = node.properties ?? {};
        node.properties = {
          ...properties,
          className: mergeClassNames(properties.className, 'sd-link-card')
        };
        node.children = [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['sd-link-card-content'] },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['sd-link-card-title'] },
                children: node.children ?? [{ type: 'text', value: label }]
              },
              ...(description
                ? [{
                  type: 'element',
                  tagName: 'span',
                  properties: { className: ['sd-link-card-description'] },
                  children: [{ type: 'text', value: description }]
                }]
                : [])
            ]
          },
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['sd-link-card-arrow'], ariaHidden: 'true' },
            children: [{ type: 'text', value: '→' }]
          }
        ];
        if (parent?.tagName === 'p' && typeof index === 'number') {
          parent.properties = {
            ...parent.properties,
            className: mergeClassNames(parent.properties?.className, 'sd-link-card-row')
          };
        }
        return;
      }

      if (isExternalWebHref(href) && !hasClass(node, 'sd-no-external-icon')) {
        const target = typeof node.properties?.target === 'string' ? node.properties.target : undefined;
        node.properties = {
          ...node.properties,
          className: mergeClassNames(node.properties?.className, 'sd-external-link'),
          ...(target === '_blank' ? { rel: mergeRel(node.properties?.rel) } : {})
        };
        node.children = [...(node.children ?? []), cloneExternalLinkIcon()];
      }
    });
  };
}

function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href);
}

function isInternalHref(href: string): boolean {
  return !href.startsWith('#') && !isExternalHref(href) && !href.startsWith('mailto:') && !href.startsWith('tel:');
}

function isExternalWebHref(href: string): boolean {
  return /^(https?:)?\/\//.test(href);
}

function shouldRenderAsLinkCard(node: any, parent: any): boolean {
  const title = typeof node.properties?.title === 'string' ? node.properties.title.trim() : '';
  if (!/^card(?::|\s|$)/i.test(title)) return false;
  if (!parent || parent.tagName !== 'p') return true;
  return (parent.children ?? []).filter((child: any) => isMeaningfulNode(child)).length === 1;
}

function parseCardDescription(title: unknown): string | undefined {
  if (typeof title !== 'string') return undefined;
  const match = /^card(?::\s*(.*)|\s+(.*))?$/i.exec(title.trim());
  const description = (match?.[1] ?? match?.[2] ?? '').trim();
  return description || undefined;
}

function mergeRel(value: unknown): string {
  const rel = new Set(
    (Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : '')
      .split(/\s+/)
      .filter(Boolean)
  );
  rel.add('noreferrer');
  rel.add('noopener');
  return [...rel].join(' ');
}

function hasClass(node: any, className: string): boolean {
  const classes = node.properties?.className;
  return Array.isArray(classes)
    ? classes.includes(className)
    : typeof classes === 'string'
      ? classes.split(/\s+/).includes(className)
      : false;
}

function cloneExternalLinkIcon() {
  return JSON.parse(JSON.stringify(externalLinkIcon));
}

function isMeaningfulNode(node: any): boolean {
  if (node.type === 'text') return Boolean(node.value?.trim());
  return node.type !== 'text';
}

function nodeToText(node: any): string {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(nodeToText).join('');
}
