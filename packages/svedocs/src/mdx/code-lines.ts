import type { SvedocsCodeBlock } from '../core/types.js';

export function decorateCodeLines(html: string, block: SvedocsCodeBlock, showLineNumbers: boolean): string {
  return html.replace(/<code([^>]*)>([\s\S]*?)<\/code>/, (_match, attrs: string, code: string) => {
    const lines = readShikiLines(code);
    if (lines.length === 0) return `<code${attrs}>${code}</code>`;
    const highlighted = new Set(block.highlightLines);
    const focused = new Set(block.focusLines);
    const decorated = lines.map(({ content, attributes, classes }, index) => {
      const line = index + 1;
      const diffRow = block.diffRows[line - 1];
      if (highlighted.has(line)) classes.push('sd-line-highlight');
      if (focused.has(line)) classes.push('sd-line-focus');
      if (block.diff) {
        if (diffRow?.kind === 'add') classes.push('sd-line-add');
        if (diffRow?.kind === 'remove') classes.push('sd-line-remove');
        if (diffRow?.kind === 'meta') classes.push('sd-line-meta');
      }
      let lineNoText: string = String(line);
      if (block.diff && diffRow) {
        if (diffRow.kind === 'add') lineNoText = '+';
        else if (diffRow.kind === 'remove') lineNoText = '-';
        else if (diffRow.kind === 'meta') lineNoText = '·';
      }
      const lineNo = showLineNumbers
        ? `<span class="sd-line-no" aria-hidden="true">${lineNoText}</span>`
        : '';
      const contentAttrs = content.length === 0 ? ' data-empty="true"' : '';
      return `<span class="${classes.join(' ')}" data-line="${line}"${attributes}${diffRow ? ` data-diff-kind="${diffRow.kind}"` : ''}>${lineNo}<span class="sd-line-content"${contentAttrs}>${content}</span></span>`;
    }).join('');
    // Keep a line-based placeholder for offscreen examples in the default theme.
    const size = /\sstyle=/.test(attrs) ? '' : ` style="--sd-code-lines:${lines.length}"`;
    return `<code${attrs}${size}>${decorated}</code>`;
  });
}

interface ShikiLine {
  content: string;
  attributes: string;
  classes: string[];
}

function readShikiLines(code: string): ShikiLine[] {
  const lines: ShikiLine[] = [];
  const opening = /\s*<span\b((?:[^>"']|"[^"]*"|'[^']*')*)>/y;
  let offset = 0;
  while (offset < code.length) {
    opening.lastIndex = offset;
    const tag = opening.exec(code);
    const attrs = tag?.[1];
    const classAttr = attrs && /\sclass="([^"]*)"/.exec(attrs);
    const classes = classAttr ? classAttr[1]!.split(/\s+/) : [];
    // Leave custom code layouts intact if they do not use Shiki line elements.
    if (!attrs || !classAttr || !classes.includes('line')) return [];
    const end = findClosingSpan(code, opening.lastIndex);
    if (end < 0) return [];
    lines.push({
      content: code.slice(opening.lastIndex, end),
      attributes: attrs.replace(classAttr[0], '').replace(/\sdata-line="[^"]*"/, ''),
      classes
    });
    offset = end + '</span>'.length;
  }
  return lines;
}

function findClosingSpan(source: string, offset: number): number {
  const spanTagPattern = /<\/?span\b[^>]*>/g;
  spanTagPattern.lastIndex = offset;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = spanTagPattern.exec(source))) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return match.index;
    } else {
      depth += 1;
    }
  }
  return -1;
}
