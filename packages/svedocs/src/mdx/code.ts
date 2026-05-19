import { visit } from 'unist-util-visit';
import type { SvedocsCodeBlock } from '../core/types.js';
import { createDiffRows, createDiffSplitRows, renderSplitDiffHtml } from './diff.js';
import {
  escapeAttribute,
  mergeClassNames,
  mergeHtmlClass,
  normalizeShikiLanguage,
  parseLineSet,
  readQuotedMeta
} from './utils.js';

export function extractCodeBlocks(markdown: string): SvedocsCodeBlock[] {
  const blocks: SvedocsCodeBlock[] = [];
  const fencePattern = /```([^\n\r]*)\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fencePattern.exec(markdown))) {
    const info = match[1]?.trim() ?? '';
    const raw = match[2] ?? '';
    const parsed = parseCodeInfo(info);
    const diffRows = parsed.diff ? createDiffRows(raw) : [];
    const splitRows = parsed.diffMode === 'split' ? createDiffSplitRows(diffRows) : [];
    blocks.push({
      id: `code-${blocks.length + 1}`,
      language: parsed.language,
      raw,
      meta: parsed.meta,
      highlightLines: parsed.highlightLines,
      focusLines: parsed.focusLines,
      ...(parsed.title ? { title: parsed.title } : {}),
      diff: parsed.diff,
      ...(parsed.diffMode ? { diffMode: parsed.diffMode } : {}),
      diffRows,
      splitRows,
      addedLines: diffRows.filter((row) => row.kind === 'add').length,
      removedLines: diffRows.filter((row) => row.kind === 'remove').length
    });
  }
  return blocks;
}

export function rehypeCodeBlocks(codeBlocks: SvedocsCodeBlock[] = []) {
  return (tree: unknown) => {
    let index = 0;
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'pre') return;
      const code = node.children?.find((child: any) => child.tagName === 'code');
      const block = codeBlocks[index++];
      const className = Array.isArray(code?.properties?.className)
        ? code.properties.className.join(' ')
        : '';
      const language = block?.language ?? /language-([^\s]+)/.exec(className)?.[1] ?? 'text';
      node.properties = {
        ...node.properties,
        className: mergeClassNames(node.properties?.className, 'sd-code'),
        'data-language': language,
        ...(block?.title ? { 'data-title': block.title } : {}),
        ...(block?.highlightLines.length ? { 'data-highlight-lines': block.highlightLines.join(',') } : {}),
        ...(block?.focusLines.length ? { 'data-focus-lines': block.focusLines.join(',') } : {}),
        ...(block?.diff ? { 'data-diff': 'true' } : {}),
        ...(block?.diffMode ? { 'data-diff-mode': block.diffMode } : {}),
        ...(block && block.addedLines > 0 ? { 'data-added-lines': String(block.addedLines) } : {}),
        ...(block && block.removedLines > 0 ? { 'data-removed-lines': String(block.removedLines) } : {})
      };
    });
  };
}

export function remarkSvedocsCodeBlocks(
  codeBlocks: SvedocsCodeBlock[] = [],
  options: { theme?: string; transformers?: unknown[] } = {}
) {
  return async (tree: unknown) => {
    let index = 0;
    const shiki = await import('shiki').catch(() => undefined);
    const transforms: Array<Promise<void>> = [];

    visit(tree as any, 'code', (node: any, childIndex: number | undefined, parent: any) => {
      const block = codeBlocks[index++];
      if (!block || childIndex === undefined || !parent?.children) return;

      if (block.diff && block.diffMode === 'split') {
        parent.children[childIndex] = {
          type: 'html',
          value: renderSplitDiffHtml(block)
        };
        return;
      }

      if (!shiki) return;
      transforms.push(
          shiki
            .codeToHtml(node.value, {
              lang: normalizeShikiLanguage(block.language),
              theme: options.theme ?? 'github-dark',
              ...(options.transformers ? { transformers: options.transformers as never[] } : {})
            })
          .then((html) => {
            parent.children[childIndex] = {
              type: 'html',
              value: decorateHighlightedCode(html, block)
            };
          })
          .catch(() => {
            node.data = {
              ...(node.data ?? {}),
              hProperties: createCodeProperties(block)
            };
          })
      );
    });

    await Promise.all(transforms);
  };
}

function parseCodeInfo(info: string): Omit<SvedocsCodeBlock, 'id' | 'raw'> {
  const [languageToken = 'text', ...rest] = info.split(/\s+/).filter(Boolean);
  const language = languageToken || 'text';
  const meta = rest.join(' ');
  const title = readQuotedMeta(meta, 'title') ?? readQuotedMeta(meta, 'filename');
  const highlightLines = parseLineSet(/\{([^}]+)\}/.exec(meta)?.[1]);
  const focusLines = parseLineSet(/focus=("[^"]+"|'[^']+'|[^\s]+)/.exec(meta)?.[1]?.replace(/^["']|["']$/g, ''));
  const diff = language === 'diff' || /\bdiff\b/.test(meta);
  const diffMode = diff && /\bsplit\b/.test(meta) ? 'split' : diff ? 'unified' : undefined;
  return {
    language,
    meta,
    highlightLines,
    focusLines,
    ...(title ? { title } : {}),
    diff,
    ...(diffMode ? { diffMode } : {}),
    diffRows: [],
    splitRows: [],
    addedLines: 0,
    removedLines: 0
  };
}

function createCodeProperties(block: SvedocsCodeBlock): Record<string, string | string[]> {
  return {
    className: ['sd-code'],
    'data-language': block.language,
    ...(block.title ? { 'data-title': block.title } : {}),
    ...(block.highlightLines.length ? { 'data-highlight-lines': block.highlightLines.join(',') } : {}),
    ...(block.focusLines.length ? { 'data-focus-lines': block.focusLines.join(',') } : {}),
    ...(block.diff ? { 'data-diff': 'true' } : {}),
    ...(block.diffMode ? { 'data-diff-mode': block.diffMode } : {}),
    ...(block.addedLines > 0 ? { 'data-added-lines': String(block.addedLines) } : {}),
    ...(block.removedLines > 0 ? { 'data-removed-lines': String(block.removedLines) } : {})
  };
}

function decorateHighlightedCode(html: string, block: SvedocsCodeBlock): string {
  let line = 0;
  const highlighted = new Set(block.highlightLines);
  const focused = new Set(block.focusLines);
  const withLines = html.replace(/<span class="line">/g, () => {
    line += 1;
    const classes = ['line'];
    if (highlighted.has(line)) classes.push('sd-line-highlight');
    if (focused.has(line)) classes.push('sd-line-focus');
    if (block.diff) {
      const diffRow = block.diffRows[line - 1];
      if (diffRow?.kind === 'add') classes.push('sd-line-add');
      if (diffRow?.kind === 'remove') classes.push('sd-line-remove');
      if (diffRow?.kind === 'meta') classes.push('sd-line-meta');
    }
    const diffRow = block.diffRows[line - 1];
    return `<span class="${classes.join(' ')}" data-line="${line}"${diffRow ? ` data-diff-kind="${diffRow.kind}"` : ''}>`;
  });
  return withLines.replace(
    /<pre([^>]*)>/,
    (_match, attrs: string) => {
      const cleanAttrs = attrs.replace(/\sclass="[^"]*"/, '').replace(/\stabindex="[^"]*"/, '');
      return `<pre${cleanAttrs} class="${mergeHtmlClass(attrs, 'sd-code')}" data-language="${escapeAttribute(block.language)}"${block.title ? ` data-title="${escapeAttribute(block.title)}"` : ''}${block.highlightLines.length ? ` data-highlight-lines="${block.highlightLines.join(',')}"` : ''}${block.focusLines.length ? ` data-focus-lines="${block.focusLines.join(',')}"` : ''}${block.diff ? ' data-diff="true"' : ''}${block.diffMode ? ` data-diff-mode="${block.diffMode}"` : ''}${block.addedLines > 0 ? ` data-added-lines="${block.addedLines}"` : ''}${block.removedLines > 0 ? ` data-removed-lines="${block.removedLines}"` : ''}>`;
    }
  );
}
