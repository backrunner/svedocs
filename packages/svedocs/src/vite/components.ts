import { readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { compile as compileMdsvex, type MdsvexOptions } from 'mdsvex';
import type { SvedocsConfig } from '../config.js';
import { resolveSvedocsHref } from '../core/routes.js';
import type { SvedocsPage, SvedocsContentManifest } from '../core/types.js';
import { createSvedocsMdsvexOptions } from '../svelte.js';
import { transformSvedocsImageComponents } from '../mdx/images.js';
import type { SvedocsThemeComponentName, SvedocsThemeComponentImports } from '../vite.js';
import { componentVirtualPrefix } from './modules.js';
const themeComponentNames = [
  'Root',
  'Layout',
  'Docs',
  'DocsShell',
  'Page',
  'PageShell',
  'Home',
  'Error',
  'Brand',
  'TopNav',
  'Header',
  'Navbar',
  'MobileNav',
  'SocialNav',
  'Sidebar',
  'Article',
  'Toc',
  'Search',
  'AskAi',
  'Footer',
  'FooterLinks',
  'ThemeToggle',
  'PageTools',
  'RenderError'
] as const satisfies readonly SvedocsThemeComponentName[];
const themeComponentNameSet = new Set<string>(themeComponentNames);

export function normalizeThemeComponentImports(entries: SvedocsThemeComponentImports | undefined): SvedocsThemeComponentImports {
  const normalized: SvedocsThemeComponentImports = {};
  const unknown: string[] = [];
  const invalid: string[] = [];

  for (const [name, specifier] of Object.entries(entries ?? {})) {
    if (!themeComponentNameSet.has(name)) {
      unknown.push(name);
      continue;
    }
    if (typeof specifier !== 'string' || specifier.trim().length === 0) {
      invalid.push(name);
      continue;
    }
    normalized[name as SvedocsThemeComponentName] = specifier.trim();
  }

  if (unknown.length > 0) {
    const label = unknown.length === 1 ? 'component key' : 'component keys';
    throw new Error(
      `Unknown svedocs theme ${label}: ${unknown.map((name) => JSON.stringify(name)).join(', ')}. ` +
      `Supported keys are: ${themeComponentNames.join(', ')}.`
    );
  }
  if (invalid.length > 0) {
    const label = invalid.length === 1 ? 'component import' : 'component imports';
    throw new Error(`Invalid svedocs theme ${label}: ${invalid.join(', ')} must be non-empty import specifiers.`);
  }

  return normalized;
}

export async function loadPageComponent(
  root: string,
  id: string,
  pages: SvedocsPage[],
  components: Record<string, string>,
  rawConfig: SvedocsConfig | undefined,
  manifestConfig: SvedocsContentManifest['config']
): Promise<string> {
  const pageId = decodeURIComponent(id.slice(`\0${componentVirtualPrefix}`.length).replace(/\.svelte$/, ''));
  const page = pages.find((item) => item.id === pageId);
  if (!page) return '<script>export const prerender = true;</script>';
  const raw = await readFile(path.join(root, page.sourcePath), 'utf8');
  const parsed = matter(raw);
  const source = injectSvedocsComponentImports(page.markdown ?? parsed.content, components);
  const headingAnchorLabel = manifestConfig.i18n.messages[
    page.locale ?? manifestConfig.i18n.defaultLocale ?? 'en'
  ]?.['heading.anchor'];
  try {
    const transformedSource = await transformSvedocsImageComponents(source, {
      ...manifestConfig.images,
      projectRoot: root,
      sourcePath: page.sourcePath,
      skip: shouldSkipPageImages(parsed.data as Record<string, unknown>)
    });
    const compiled = await compileMdsvex(transformedSource, {
      filename: page.sourcePath,
      ...createSvedocsMdsvexOptions(
        transformedSource,
        createMdsvexOptionsFromConfig(rawConfig),
        {
          ...(manifestConfig.theme.defaultMode === 'system'
            ? {
                codeThemes: {
                  light: manifestConfig.theme.codeTheme.light,
                  dark: manifestConfig.theme.codeTheme.dark
                }
              }
            : { codeTheme: manifestConfig.theme.codeTheme[manifestConfig.theme.defaultMode] }),
          codeCopyButton: manifestConfig.theme.code.copyButton,
          ...(headingAnchorLabel ? { headingAnchorLabel } : {}),
          resolveHref: (href) => resolveSvedocsHref({
            href,
            pages,
            config: manifestConfig,
            page
          }).href,
          ...(rawConfig?.markdown?.shiki?.transformers ? { shikiTransformers: rawConfig.markdown.shiki.transformers } : {}),
          imageOptimization: {
            ...manifestConfig.images,
            projectRoot: root,
            sourcePath: page.sourcePath,
            skip: shouldSkipPageImages(parsed.data as Record<string, unknown>)
          }
        }
      )
    });
    const result = await compiled;
    return stripInlineSourceMap(result?.code ?? '<script>export const prerender = true;</script>');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile ${page.sourcePath} as Svelte-compatible MDX: ${message}`);
  }
}

export function shouldSkipPageImages(frontmatter: Record<string, unknown>): boolean {
  return frontmatter.imageCompression === false
    || frontmatter.imageOptimization === false
    || frontmatter.images === false
    || frontmatter.noImageCompression === true;
}

export function createMdsvexOptionsFromConfig(config: SvedocsConfig | undefined): MdsvexOptions {
  const options: MdsvexOptions = {};
  if (config?.markdown?.remarkPlugins) {
    options.remarkPlugins = config.markdown.remarkPlugins as NonNullable<MdsvexOptions['remarkPlugins']>;
  }
  if (config?.markdown?.rehypePlugins) {
    options.rehypePlugins = config.markdown.rehypePlugins as NonNullable<MdsvexOptions['rehypePlugins']>;
  }
  return options;
}

export function injectSvedocsComponentImports(source: string, components: Record<string, string>): string {
  const imports = Object.entries(components)
    .map(([name, specifier]) => `import ${name} from ${JSON.stringify(specifier)};`)
    .join('\n');
  if (!imports) return source;
  const instanceScript = /<script(\s(?![^>]*\bcontext=["']module["'])[^>]*)?>/.exec(source);
  if (!instanceScript || instanceScript.index === undefined) {
    return `<script>\n${imports}\n</script>\n\n${source}`;
  }
  const insertAt = instanceScript.index + instanceScript[0].length;
  return `${source.slice(0, insertAt)}\n${imports}${source.slice(insertAt)}`;
}

export function stripInlineSourceMap(code: string): string {
  return code.replace(/\n?\/\/# sourceMappingURL=data:application\/json;base64,[A-Za-z0-9+/=]+$/m, '');
}
