import { visit } from 'unist-util-visit';

export function rehypeSvedocsHeadingAnchors(options: { label?: string } = {}) {
  const label = options.label ?? 'Link to this section';
  return (tree: unknown) => {
    visit(tree as never, 'element', (node: any) => {
      if (!['h2', 'h3', 'h4'].includes(node.tagName)) return;
      const id = typeof node.properties?.id === 'string' ? node.properties.id : '';
      if (!id) return;
      node.children = [
        ...(node.children ?? []),
        {
          type: 'element',
          tagName: 'a',
          properties: {
            className: ['sd-heading-anchor'],
            href: `#${id}`,
            ariaLabel: label
          },
          children: [{
            type: 'element',
            tagName: 'svg',
            properties: {
              ariaHidden: 'true',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
            children: [
              { type: 'element', tagName: 'path', properties: { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }, children: [] },
              { type: 'element', tagName: 'path', properties: { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }, children: [] }
            ]
          }]
        }
      ];
    });
  };
}
