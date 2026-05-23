import { mdsvex } from 'mdsvex';
import type { MdsvexOptions } from 'mdsvex';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { extractCodeBlocks, rehypeCodeBlocks, remarkSvedocsCodeBlocks } from './mdx/code.js';

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
  source: string,
  options: MdsvexOptions = {},
  svedocsOptions: { codeTheme?: string; codeThemes?: { light?: string; dark?: string }; shikiTransformers?: unknown[] } = {}
): MdsvexOptions {
  const codeBlocks = extractCodeBlocks(source);
  return {
    extensions: [...svedocsContentExtensions],
    ...options,
      remarkPlugins: [
        remarkGfm,
        remarkMath,
        [remarkSvedocsCodeBlocks, codeBlocks, { theme: svedocsOptions.codeTheme, themes: svedocsOptions.codeThemes, transformers: svedocsOptions.shikiTransformers }],
        ...((options.remarkPlugins ?? []) as any[])
      ] as any,
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['sd-heading-anchor'],
            ariaHidden: 'true'
          },
          content: {
            type: 'text',
            value: '#'
          }
        }
      ],
      rehypeKatex,
      [rehypeCodeBlocks, codeBlocks],
      ...((options.rehypePlugins ?? []) as any[])
    ] as any
  };
}
