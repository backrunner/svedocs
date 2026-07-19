import { visit } from 'unist-util-visit';
import type { SvedocsCodeBlock, SvedocsMessages } from '../core/types.js';
import { createDiffRows, createDiffSplitRows, renderSplitDiffHtml } from './diff.js';
import {
  escapeAttribute,
  escapeHtml,
  mergeClassNames,
  mergeHtmlClass,
  normalizeShikiLanguage,
  parseLineSet,
  readQuotedMeta
} from './utils.js';

export type SvedocsMarkdownMessages = Pick<
  SvedocsMessages,
  'code.copy' | 'code.copyDiff' | 'diff.label' | 'diff.aria' | 'diff.before' | 'diff.after'
> & Partial<Pick<SvedocsMessages, 'heading.anchor'>>;

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
      removedLines: diffRows.filter((row) => row.kind === 'remove').length,
      ...(parsed.noLineNumbers ? { noLineNumbers: true } : {}),
      ...(typeof parsed.wrap === 'boolean' ? { wrap: parsed.wrap } : {})
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
  options: { theme?: string; themes?: { light?: string; dark?: string }; transformers?: unknown[]; lineNumbers?: boolean; wrap?: boolean; copyButton?: boolean; messages?: SvedocsMarkdownMessages | undefined } = {}
) {
  return async (tree: unknown) => {
    let index = 0;
    const shiki = await import('shiki').catch(() => undefined);
    const transforms: Array<Promise<void>> = [];
    const showLineNumbers = options.lineNumbers !== false;
    const globalWrap = options.wrap === true;

    visit(tree as any, 'code', (node: any, childIndex: number | undefined, parent: any) => {
      const block = codeBlocks[index++];
      if (!block || childIndex === undefined || !parent?.children) return;

      if (block.diff && block.diffMode === 'split') {
        parent.children[childIndex] = {
          type: 'html',
          value: renderSplitDiffHtml(block, { copyButton: options.copyButton !== false, messages: options.messages })
        };
        return;
      }

      if (!shiki) return;
      const themes = options.theme !== undefined
        ? undefined
        : options.themes ?? { light: 'github-light', dark: 'github-dark' };
      const useDualTheme = Boolean(themes?.light && themes?.dark);
      const renderLineNumbers = showLineNumbers && !block.noLineNumbers;
      const wrapLines = typeof block.wrap === 'boolean' ? block.wrap : globalWrap;
      const transformers = [
        ...(options.transformers ?? []),
        forceShikiTextColorTransformer
      ];
      transforms.push(
          shiki
            .codeToHtml(node.value, {
              lang: normalizeShikiLanguage(block.language),
              ...(useDualTheme
                ? {
                    themes: { light: themes!.light!, dark: themes!.dark! },
                    defaultColor: false
                  }
                : { theme: options.theme ?? themes?.dark ?? 'github-dark' }),
              transformers: transformers as never[]
            } as never)
          .then((html) => {
            parent.children[childIndex] = {
              type: 'html',
              value: decorateHighlightedCode(html, block, {
                showLineNumbers: renderLineNumbers,
                wrap: wrapLines,
                copyButton: options.copyButton !== false,
                messages: options.messages
              })
            };
          })
          .catch(() => {
            node.data = {
              ...(node.data ?? {}),
              hProperties: createCodeProperties(block, renderLineNumbers, wrapLines)
            };
          })
      );
    });

    await Promise.all(transforms);
  };
}

const forceShikiTextColorTransformer = {
  name: 'svedocs:force-text-color',
  pre(node: { properties?: Record<string, unknown> }) {
    protectShikiTextColor(node.properties);
  },
  span(node: { properties?: Record<string, unknown> }) {
    protectShikiTextColor(node.properties);
  }
};

function protectShikiTextColor(properties: Record<string, unknown> | undefined): void {
  if (!properties || typeof properties.style !== 'string') return;
  const style = properties.style;

  properties.style = style
    .split(';')
    .map((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 0 || declaration.slice(0, separator).trim().toLowerCase() !== 'color') {
        return declaration;
      }
      return /!important\s*$/i.test(declaration) ? declaration : `${declaration} !important`;
    })
    .join(';');
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
  const noLineNumbers = /\b(no-?line-?numbers|nolinenumbers)\b/i.test(meta)
    || /\bshowLineNumbers=(false|0|no)\b/i.test(meta)
    || /\blineNumbers=(false|0|no)\b/i.test(meta);
  const wrapTrue = /\bwrap\b(?!=)/i.test(meta) || /\bwrap=(true|1|yes)\b/i.test(meta);
  const wrapFalse = /\bno-?wrap\b/i.test(meta) || /\bwrap=(false|0|no)\b/i.test(meta);
  const wrap = wrapTrue ? true : wrapFalse ? false : undefined;
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
    removedLines: 0,
    ...(noLineNumbers ? { noLineNumbers: true } : {}),
    ...(typeof wrap === 'boolean' ? { wrap } : {})
  };
}

function createCodeProperties(block: SvedocsCodeBlock, showLineNumbers: boolean = true, wrap: boolean = false): Record<string, string | string[]> {
  return {
    className: ['sd-code'],
    'data-language': block.language,
    ...(block.title ? { 'data-title': block.title } : {}),
    ...(block.highlightLines.length ? { 'data-highlight-lines': block.highlightLines.join(',') } : {}),
    ...(block.focusLines.length ? { 'data-focus-lines': block.focusLines.join(',') } : {}),
    ...(block.diff ? { 'data-diff': 'true' } : {}),
    ...(block.diffMode ? { 'data-diff-mode': block.diffMode } : {}),
    ...(block.addedLines > 0 ? { 'data-added-lines': String(block.addedLines) } : {}),
    ...(block.removedLines > 0 ? { 'data-removed-lines': String(block.removedLines) } : {}),
    ...(showLineNumbers ? {} : { 'data-no-line-numbers': 'true' }),
    ...(wrap ? { 'data-wrap': 'true' } : {})
  };
}

function decorateHighlightedCode(html: string, block: SvedocsCodeBlock, options: { showLineNumbers: boolean; wrap: boolean; copyButton?: boolean; messages?: SvedocsMarkdownMessages | undefined }): string {
  const showLineNumbers = options.showLineNumbers;
  const wrap = options.wrap;
  const trimmed = stripTrailingEmptyLine(html);
  const withDecoratedLines = decorateCodeLines(trimmed, block, showLineNumbers);
  const header = renderCodeHeader(block, { copyButton: options.copyButton !== false, messages: options.messages });
  return withDecoratedLines.replace(
    /<pre([^>]*)>/,
    (_match, attrs: string) => {
      const cleanAttrs = attrs.replace(/\sclass="[^"]*"/, '').replace(/\stabindex="[^"]*"/, '');
      return `<pre${cleanAttrs} class="${mergeHtmlClass(attrs, 'sd-code')}" data-language="${escapeAttribute(block.language)}" data-copy="${escapeAttribute(block.raw)}" data-enhanced="true"${block.title ? ` data-title="${escapeAttribute(block.title)}"` : ''}${block.highlightLines.length ? ` data-highlight-lines="${block.highlightLines.join(',')}"` : ''}${block.focusLines.length ? ` data-focus-lines="${block.focusLines.join(',')}"` : ''}${block.diff ? ' data-diff="true"' : ''}${block.diffMode ? ` data-diff-mode="${block.diffMode}"` : ''}${block.addedLines > 0 ? ` data-added-lines="${block.addedLines}"` : ''}${block.removedLines > 0 ? ` data-removed-lines="${block.removedLines}"` : ''}${showLineNumbers ? '' : ' data-no-line-numbers="true"'}${wrap ? ' data-wrap="true"' : ''}>${header}`;
    }
  ).replace(
    /<code([^>]*)>/,
    (_match, attrs: string) => `<code${attrs} data-copy="${escapeAttribute(block.raw)}">`
  );
}

function decorateCodeLines(html: string, block: SvedocsCodeBlock, showLineNumbers: boolean): string {
  return html.replace(/<code([^>]*)>([\s\S]*?)<\/code>/, (_match, attrs: string, code: string) => {
    const lines = readShikiLines(code);
    if (lines.length === 0) return `<code${attrs}>${code}</code>`;
    const highlighted = new Set(block.highlightLines);
    const focused = new Set(block.focusLines);
    const decorated = lines.map((content, index) => {
      const line = index + 1;
      const diffRow = block.diffRows[line - 1];
      const classes = ['line'];
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
      return `<span class="${classes.join(' ')}" data-line="${line}"${diffRow ? ` data-diff-kind="${diffRow.kind}"` : ''}>${lineNo}<span class="sd-line-content"${contentAttrs}>${content}</span></span>`;
    }).join('');
    return `<code${attrs}>${decorated}</code>`;
  });
}

function readShikiLines(code: string): string[] {
  const lines: string[] = [];
  const open = '<span class="line">';
  let offset = 0;
  while (offset < code.length) {
    const start = code.indexOf(open, offset);
    if (start < 0) break;
    const contentStart = start + open.length;
    const end = findClosingSpan(code, contentStart);
    if (end < 0) break;
    lines.push(code.slice(contentStart, end));
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

function renderCodeHeader(block: SvedocsCodeBlock, options: { copyButton: boolean; messages?: SvedocsMarkdownMessages | undefined }): string {
  const language = block.language || 'text';
  const languageLabel = displayLanguage(language, options.messages);
  const parts: string[] = [];
  parts.push(`<span class="sd-code-language" data-language="${escapeAttribute(language)}">${escapeHtml(languageLabel)}</span>`);
  if (block.title) {
    parts.push(`<span class="sd-code-title">${escapeHtml(block.title)}</span>`);
  }
  if (block.addedLines > 0 || block.removedLines > 0) {
    const stats: string[] = [];
    if (block.addedLines > 0) {
      stats.push(`<span class="sd-code-stat-add">+${block.addedLines}</span>`);
    }
    if (block.removedLines > 0) {
      stats.push(`<span class="sd-code-stat-remove">-${block.removedLines}</span>`);
    }
    parts.push(`<span class="sd-code-stats">${stats.join('')}</span>`);
  }
  if (options.copyButton) {
    const label = options.messages?.['code.copy'] ?? 'Copy code';
    parts.push(`<button type="button" class="sd-code-copy" data-sd-copy="" aria-label="${escapeAttribute(label)}" title="${escapeAttribute(label)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h9v14H9zM6 8v12h10"/></svg></button>`);
  }
  return `<div class="sd-code-header">${parts.join('')}</div>`;
}

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  jsx: 'JSX',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  svelte: 'Svelte',
  svx: 'Svelte',
  vue: 'Vue',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  json: 'JSON',
  jsonc: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  md: 'Markdown',
  mdx: 'MDX',
  sh: 'Shell',
  shell: 'Shell',
  bash: 'Bash',
  zsh: 'Zsh',
  ps1: 'PowerShell',
  python: 'Python',
  py: 'Python',
  rs: 'Rust',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  c: 'C',
  cpp: 'C++',
  cs: 'C#',
  sql: 'SQL',
  diff: 'Diff',
  text: 'Text',
  txt: 'Text',
  plaintext: 'Text'
};

function displayLanguage(language: string, messages?: SvedocsMarkdownMessages): string {
  if (language === 'diff') return messages?.['diff.label'] ?? LANGUAGE_DISPLAY_NAMES.diff ?? 'Diff';
  return LANGUAGE_DISPLAY_NAMES[language] ?? language.toUpperCase();
}

function stripTrailingEmptyLine(html: string): string {
  return html
    .replace(/<span class="line"><\/span>(\s*)(<\/code>)/, '$2')
    .replace(/<span class="line">\s*<\/span>(\s*)(<\/code>)/, '$2');
}
