import { decorateCodeLines } from './code-lines.js';
import { createCodeBlock } from './code-block.js';
import { visit } from 'unist-util-visit';
import type { SvedocsCodeBlock, SvedocsMessages } from '../core/types.js';
import { renderSplitDiffHtml } from './diff.js';
import {
  escapeAttribute,
  escapeHtml,
  mergeClassNames,
  mergeHtmlClass,
  normalizeShikiLanguage
} from './utils.js';

export type SvedocsMarkdownMessages = Pick<
  SvedocsMessages,
  'code.copy' | 'code.copyDiff' | 'diff.label' | 'diff.aria' | 'diff.before' | 'diff.after'
> & Partial<Pick<SvedocsMessages, 'heading.anchor'>>;

export function rehypeCodeBlocks() {
  return (tree: unknown) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'pre' || node.properties?.dataEnhanced || node.properties?.['data-enhanced']) return;
      const code = node.children?.find((child: any) => child.tagName === 'code');
      const properties = code?.properties ?? {};
      const classes: unknown[] = Array.isArray(properties.className) ? properties.className : [];
      const language = classes.find((name): name is string => typeof name === 'string' && name.startsWith('language-'))?.slice(9);
      node.properties ??= {};
      node.properties.className = mergeClassNames(node.properties.className, 'sd-code');
      node.properties.dataLanguage ??= properties.dataLanguage ?? properties['data-language'] ?? language ?? 'text';
      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith('data-') && key !== 'data-language') node.properties[key] ??= value;
      }
    });
  };
}

interface CodeOptions {
  svelte?: boolean;
  onBlock?: (block: SvedocsCodeBlock) => void;
  theme?: string;
  themes?: { light?: string; dark?: string };
  transformers?: unknown[];
  lineNumbers?: boolean;
  wrap?: boolean;
  copyButton?: boolean;
  messages?: SvedocsMarkdownMessages;
}

export function remarkSvedocsCodeBlocks(options: CodeOptions = {}) {
  function htmlNode(html: string) {
    // Generated SVX markup goes through the Svelte compiler after remark.
    const value = options.svelte ? html.replaceAll('{', '&#123;').replaceAll('}', '&#125;') : html;
    return { type: 'html', value };
  }

  return async (tree: unknown) => {
    let index = 0;
    let shiki: Promise<typeof import('shiki')> | undefined;
    const transforms: Array<Promise<void>> = [];
    const showLineNumbers = options.lineNumbers !== false;
    const globalWrap = options.wrap === true;

    visit(tree as any, 'code', (node: any, childIndex: number | undefined, parent: any) => {
      if (childIndex === undefined || !parent?.children) return;
      const block = createCodeBlock(index++, node.lang || 'text', node.meta ?? '', node.value);
      options.onBlock?.(block);

      if (block.diff && block.diffMode === 'split') {
        parent.children[childIndex] = htmlNode(renderSplitDiffHtml(block, {
          copyButton: options.copyButton !== false, messages: options.messages
        }));
        return;
      }

      shiki ??= import('shiki');
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
        shiki.then((module) => {
          const language = normalizeShikiLanguage(block.language);
          const supported = module.isSpecialLang(language) || Object.hasOwn(module.bundledLanguages, language);
          return module.codeToHtml(node.value, {
            lang: supported ? language : 'text',
            ...(useDualTheme
              ? {
                  themes: { light: themes!.light!, dark: themes!.dark! },
                  defaultColor: false
                }
              : { theme: options.theme ?? themes?.dark ?? 'github-dark' }),
            mergeSameStyleTokens: !options.transformers?.length,
            transformers: transformers as never[]
          } as never);
        })
        .catch(() => {
          // Unknown grammars and unavailable themes still get the same accessible controls.
          const lines = (node.value as string).split('\n').map((line) => `<span class="line">${escapeHtml(line)}</span>`);
          return `<pre><code>${lines.join('\n')}</code></pre>`;
        })
        .then((html) => {
          parent.children[childIndex] = htmlNode(decorateHighlightedCode(html, block, {
            showLineNumbers: renderLineNumbers,
            wrap: wrapLines,
            copyButton: options.copyButton !== false,
            messages: options.messages
          }));
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

function decorateHighlightedCode(html: string, block: SvedocsCodeBlock, options: { showLineNumbers: boolean; wrap: boolean; copyButton?: boolean; messages?: SvedocsMarkdownMessages | undefined }): string {
  const showLineNumbers = options.showLineNumbers;
  const wrap = options.wrap;
  const withDecoratedLines = decorateCodeLines(html, block, showLineNumbers);
  const header = renderCodeHeader(block, { copyButton: options.copyButton !== false, messages: options.messages });
  return withDecoratedLines.replace(
    /<pre([^>]*)>/,
    (_match, attrs: string) => {
      const cleanAttrs = attrs.replace(/\sclass="[^"]*"/, '').replace(/\stabindex="[^"]*"/, '');
      return `<pre${cleanAttrs} class="${mergeHtmlClass(attrs, 'sd-code')}" data-language="${escapeAttribute(block.language)}" data-copy="${escapeAttribute(block.raw)}" data-enhanced="true"${block.title ? ` data-title="${escapeAttribute(block.title)}"` : ''}${block.highlightLines.length ? ` data-highlight-lines="${block.highlightLines.join(',')}"` : ''}${block.focusLines.length ? ` data-focus-lines="${block.focusLines.join(',')}"` : ''}${block.diff ? ' data-diff="true"' : ''}${block.diffMode ? ` data-diff-mode="${block.diffMode}"` : ''}${block.addedLines > 0 ? ` data-added-lines="${block.addedLines}"` : ''}${block.removedLines > 0 ? ` data-removed-lines="${block.removedLines}"` : ''}${showLineNumbers ? '' : ' data-no-line-numbers="true"'}${wrap ? ' data-wrap="true"' : ''}>${header}`;
    }
  );
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
  return Object.hasOwn(LANGUAGE_DISPLAY_NAMES, language) ? LANGUAGE_DISPLAY_NAMES[language]! : language.toUpperCase();
}
