import { visit } from 'unist-util-visit';
import type { SvedocsResolvedConfig } from '../core/types.js';
import { optimizeSvedocsImageHref, normalizePath, type ImageProperties, type SvedocsImageOptimizationOptions } from './image-assets.js';
export { optimizeSvedocsImageHref, type SvedocsImageOptimizationOptions } from './image-assets.js';

/** Rewrites local Markdown images to deterministic, build-generated optimized assets. */
export function rehypeSvedocsImages(options: SvedocsImageOptimizationOptions) {
  return async (tree: unknown) => {
    if (options.enabled === false || options.skip) return;
    const pending: Promise<void>[] = [];
    visit(tree as any, 'element', (node: any) => {
      if (node.tagName !== 'img') return;
      const properties = (node.properties ?? {}) as ImageProperties;
      if (shouldSkipImage(properties)) return;
      const href = typeof properties.src === 'string' ? properties.src : '';
      if (!href) return;
      pending.push((async () => {
        const optimized = await optimizeSvedocsImageHref(href, options, properties);
        if (optimized) properties.src = optimized;
      })());
    });
    await Promise.all(pending);
  };
}

export async function optimizeSvedocsThemeImages(
  config: SvedocsResolvedConfig,
  projectRoot: string,
  onDependency?: (file: string) => void
): Promise<SvedocsResolvedConfig> {
  if (!config.images.enabled) return config;
  const optimize = (href: string | undefined, maxWidth?: number) => href
    ? optimizeSvedocsImageHref(href, {
        projectRoot,
        enabled: true,
        onDependency,
        maxWidth: maxWidth ?? config.images.maxWidth,
        quality: config.images.quality,
        format: config.images.format,
        outputDir: config.images.outputDir
      })
    : Promise.resolve(undefined);
  const [logo, visual] = await Promise.all([
    optimize(config.theme.brand.logo, Math.min(config.images.maxWidth, 320)),
    config.theme.home.visual.type === 'image'
      ? optimize(config.theme.home.visual.src)
      : Promise.resolve(undefined)
  ]);
  return {
    ...config,
    theme: {
      ...config.theme,
      brand: { ...config.theme.brand, ...(logo ? { logo } : {}) },
      home: {
        ...config.theme.home,
        visual: { ...config.theme.home.visual, ...(visual ? { src: visual } : {}) }
      }
    }
  };
}

export async function transformSvedocsImageComponents(
  source: string,
  options: SvedocsImageOptimizationOptions
): Promise<string> {
  if (options.enabled === false || options.skip || !source.includes('<SvedocsImage')) return source;

  const tags = /<SvedocsImage\b[^>]*>/g;
  const matches = Array.from(source.matchAll(tags));
  if (matches.length === 0) return source;

  let output = '';
  let cursor = 0;
  for (const match of matches) {
    const tag = match[0];
    const start = match.index ?? 0;
    output += source.slice(cursor, start);
    cursor = start + tag.length;

    if (shouldSkipSvedocsImageComponent(tag)) {
      output += tag;
      continue;
    }

    const srcAttribute = readStaticAttribute(tag, 'src');
    if (!srcAttribute || isGeneratedImageHref(srcAttribute.value, options)) {
      output += tag;
      continue;
    }
    const optimized = await optimizeSvedocsImageHref(srcAttribute.value, options, {
      width: readStaticAttribute(tag, 'displayWidth')?.value ?? readStaticAttribute(tag, 'width')?.value
    });
    if (!optimized) {
      output += tag;
      continue;
    }
    output += `${tag.slice(0, srcAttribute.valueStart)}${optimized}${tag.slice(srcAttribute.valueStart + srcAttribute.value.length)}`;
  }
  return output + source.slice(cursor);
}

function shouldSkipSvedocsImageComponent(tag: string): boolean {
  return /(?:no-compress|no-optimize|unoptimized|data-svedocs-no-compress|data-svedocs-no-optimize)/i.test(tag);
}

function readStaticAttribute(tag: string, name: string): {
  start: number;
  valueStart: number;
  end: number;
  quote: string;
  value: string;
} | undefined {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:\\{\\s*)?(["'])([^"']+)\\1\\s*\\}?`, 'i');
  const match = pattern.exec(tag);
  if (match?.index !== undefined) {
    const quote = match[1]!;
    const value = match[2]!;
    const valueStart = match.index + match[0].indexOf(quote) + 1;
    return {
      start: match.index,
      valueStart,
      end: match.index + match[0].length,
      quote,
      value
    };
  }
  const numericPattern = new RegExp(`\\b${name}\\s*=\\s*\\{\\s*(\\d+(?:\\.\\d+)?)\\s*\\}`, 'i');
  const numericMatch = numericPattern.exec(tag);
  if (!numericMatch || numericMatch.index === undefined) return undefined;
  const value = numericMatch[1]!;
  const valueStart = numericMatch.index + numericMatch[0].indexOf(value);
  return {
    start: numericMatch.index,
    valueStart,
    end: numericMatch.index + numericMatch[0].length,
    quote: '',
    value
  };
}

function isGeneratedImageHref(href: string, options: SvedocsImageOptimizationOptions): boolean {
  const outputDir = options.outputDir ?? 'static/_svedocs/images';
  const relative = normalizePath(outputDir.replace(/^static\/?/, '')).replace(/\/$/, '');
  return relative.length > 0 && (href === `/${relative}` || href.startsWith(`/${relative}/`));
}

function shouldSkipImage(properties: ImageProperties): boolean {
  for (const key of [
    'data-svedocs-no-compress',
    'dataSvedocsNoCompress',
    'data-svedocs-no-optimize',
    'dataSvedocsNoOptimize',
    'data-no-compress',
    'dataNoCompress',
    'data-no-optimize',
    'dataNoOptimize'
  ]) {
    if (properties[key] !== undefined && properties[key] !== false && properties[key] !== 'false') return true;
  }
  const classes = Array.isArray(properties.className)
    ? properties.className.map(String)
    : typeof properties.className === 'string' ? properties.className.split(/\s+/) : [];
  if (classes.some((value) => /^(?:sd-)?(?:no-compress|no-optimize|unoptimized)$/.test(value))) return true;
  return typeof properties.title === 'string' && /^(?:no[- ]?(?:compress|optimize)|unoptimized)$/i.test(properties.title.trim());
}
