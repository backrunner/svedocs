import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { SvedocsCodeBlock, SvedocsHeading } from '../core/types.js';
import { extractMarkdownOutline, markdownAstToPlainText } from './ast.js';
import { extractCodeBlocks, rehypeCodeBlocks, remarkSvedocsCodeBlocks, type SvedocsMarkdownMessages } from './code.js';
import { createDiffRows, createDiffSplitRows } from './diff.js';
import { rehypeSvedocsHeadingAnchors } from './headings.js';
import { rehypeSvedocsLinks } from './links.js';
import { markdownToPlainText } from './utils.js';

export interface CompiledMarkdown {
  html: string;
  plainText: string;
  headings: SvedocsHeading[];
  codeBlocks: SvedocsCodeBlock[];
  title?: string;
}

export interface CompileMarkdownOptions {
  remarkPlugins?: unknown[];
  rehypePlugins?: unknown[];
  codeTheme?: string;
  codeThemes?: { light?: string; dark?: string };
  shikiTransformers?: unknown[];
  codeLineNumbers?: boolean;
  codeWrap?: boolean;
  codeCopyButton?: boolean;
  messages?: SvedocsMarkdownMessages;
  resolveHref?: (href: string) => string;
}

export async function compileMarkdown(
  markdown: string,
  options: CompileMarkdownOptions = {}
): Promise<CompiledMarkdown> {
  const extracted = extractMarkdownOutline(markdown);
  const codeBlocks = extractCodeBlocks(markdown);
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath);

  for (const plugin of options.remarkPlugins ?? []) {
    processor.use(plugin as never);
  }

  processor
    .use(
      remarkSvedocsCodeBlocks,
      codeBlocks,
      {
        ...(options.codeTheme ? { theme: options.codeTheme } : {}),
        ...(options.codeThemes ? { themes: options.codeThemes } : {}),
        ...(options.shikiTransformers ? { transformers: options.shikiTransformers } : {}),
        ...(typeof options.codeLineNumbers === 'boolean' ? { lineNumbers: options.codeLineNumbers } : {}),
        ...(typeof options.codeWrap === 'boolean' ? { wrap: options.codeWrap } : {}),
        ...(typeof options.codeCopyButton === 'boolean' ? { copyButton: options.codeCopyButton } : {}),
        ...(options.messages ? { messages: options.messages } : {})
      }
    )
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeSvedocsHeadingAnchors, options.messages?.['heading.anchor']
      ? { label: options.messages['heading.anchor'] }
      : {})
    .use(rehypeKatex)
    .use(rehypeSvedocsLinks, options.resolveHref ? { resolveHref: options.resolveHref } : {});

  for (const plugin of options.rehypePlugins ?? []) {
    processor.use(plugin as never);
  }

  const file = await processor
    .use(rehypeCodeBlocks, codeBlocks)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return {
    html: String(file),
    plainText: markdownAstToPlainText(markdown),
    headings: extracted.headings,
    codeBlocks,
    ...(extracted.title ? { title: extracted.title } : {})
  };
}

export { createDiffRows, createDiffSplitRows, extractCodeBlocks, markdownToPlainText };
