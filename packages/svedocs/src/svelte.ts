import { mdsvex } from 'mdsvex';
import type { MdsvexOptions } from 'mdsvex';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { rehypeCodeBlocks, remarkSvedocsCodeBlocks, type SvedocsMarkdownMessages } from './mdx/code.js';
import { rehypeSvedocsHeadingAnchors } from './mdx/headings.js';
import { rehypeSvedocsLinks } from './mdx/links.js';
import { rehypeSvedocsImages, type SvedocsImageOptimizationOptions } from './mdx/images.js';

export const svedocsContentExtensions = ['.md', '.mdx', '.svx'] as const;
export const svedocsSvelteExtensions = ['.svelte', ...svedocsContentExtensions] as const;

export interface SvedocsPreprocessor {
  name: string;
  markup(input: {
    content: string;
    filename?: string;
  }): Promise<{
    code: string;
    data?: Record<string, unknown>;
    map?: string;
  } | undefined>;
}

export function svedocsPreprocess(options: MdsvexOptions = {}): SvedocsPreprocessor {
  return {
    name: 'svedocs-mdsvex',
    async markup(input) {
      const processor = mdsvex(createSvedocsMdsvexOptions(input.content, options)) as SvedocsPreprocessor;
      return processor.markup(input);
    }
  };
}

export function createSvedocsMdsvexOptions(
  _source: string,
  options: MdsvexOptions = {},
  svedocsOptions: {
    codeTheme?: string;
    codeThemes?: { light?: string; dark?: string };
    shikiTransformers?: unknown[];
    codeCopyButton?: boolean;
    codeLineNumbers?: boolean;
    codeWrap?: boolean;
    headingAnchorLabel?: string;
    messages?: SvedocsMarkdownMessages;
    resolveHref?: (href: string) => string;
    imageOptimization?: SvedocsImageOptimizationOptions;
  } = {}
): MdsvexOptions {
  return {
    extensions: [...svedocsContentExtensions],
    ...options,
    remarkPlugins: [
      remarkGfm,
      remarkMath,
      [remarkSvedocsCodeBlocks, {
        svelte: true,
        messages: svedocsOptions.messages,
        theme: svedocsOptions.codeTheme,
        themes: svedocsOptions.codeThemes,
        transformers: svedocsOptions.shikiTransformers,
        lineNumbers: svedocsOptions.codeLineNumbers,
        wrap: svedocsOptions.codeWrap,
        ...(typeof svedocsOptions.codeCopyButton === 'boolean' ? { copyButton: svedocsOptions.codeCopyButton } : {})
      }],
      ...((options.remarkPlugins ?? []) as any[])
    ] as any,
    rehypePlugins: [
      rehypeSlug,
      [rehypeSvedocsHeadingAnchors, { label: svedocsOptions.headingAnchorLabel }],
      rehypeKatex,
      [rehypeSvedocsLinks, { resolveHref: svedocsOptions.resolveHref }],
      rehypeCodeBlocks,
      ...((options.rehypePlugins ?? []) as any[]),
      ...(svedocsOptions.imageOptimization
        ? [[rehypeSvedocsImages, svedocsOptions.imageOptimization]]
        : [])
    ] as any
  };
}
