import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

export interface SvedocsImageOptimizationOptions {
  projectRoot: string;
  sourcePath?: string;
  enabled?: boolean;
  maxWidth?: number;
  quality?: number;
  format?: 'original' | 'webp' | 'avif';
  outputDir?: string;
  skip?: boolean;
  /** Internal dependency tracking for watch builds, including missing candidates. */
  onDependency?: ((file: string) => void) | undefined;
}

export interface ImageProperties {
  src?: unknown;
  width?: unknown;
  height?: unknown;
  title?: unknown;
  className?: unknown;
  style?: unknown;
  [key: string]: unknown;
}

const rasterExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff']);
const requireFromPackage = createRequire(new URL('../../package.json', import.meta.url));

export async function optimizeSvedocsImageHref(
  href: string,
  options: SvedocsImageOptimizationOptions,
  properties?: ImageProperties
): Promise<string | undefined> {
  const { pathname, suffix } = splitUrlSuffix(href);
  if (!isLocalImagePath(pathname)) return undefined;
  let sourcePath: string | undefined;
  for (const candidate of await resolveSourcePaths(pathname, options)) {
    options.onDependency?.(candidate);
    if (await fileExists(candidate)) {
      sourcePath = candidate;
      break;
    }
  }
  if (!sourcePath) return undefined;
  try {
    const output = await createOptimizedImage(sourcePath, options, displayWidth(properties));
    return output ? `${output}${suffix}` : undefined;
  } catch {
    return undefined;
  }
}

async function createOptimizedImage(
  sourcePath: string,
  options: SvedocsImageOptimizationOptions,
  requestedWidth?: number
): Promise<string | undefined> {
  const outputRoot = resolveOutputRoot(options);
  if (!outputRoot) return undefined;
  const sourceExtension = path.extname(sourcePath).toLowerCase();
  if (!rasterExtensions.has(sourceExtension)) return undefined;
  const source = await readFile(sourcePath);
  const sharp = loadSharp();
  if (!sharp) return undefined;
  // Inspect animated formats with all frames loaded so animated assets stay untouched.
  const metadata = await sharp(source, { animated: true }).metadata();
  if (!metadata.width || metadata.pages && metadata.pages > 1) return undefined;
  const input = sharp(source, { animated: false });
  // Sharp requires an integer pixel width; display CSS can legitimately use decimals.
  const preferredWidth = [requestedWidth, options.maxWidth]
    .find((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
    ?? metadata.width;
  const targetWidth = Math.max(1, Math.min(metadata.width, Math.round(preferredWidth)));
  const format = options.format ?? 'webp';
  const extension = outputExtension(format, sourceExtension);
  const fingerprint = createHash('sha256')
    .update(source)
    .update(`:${targetWidth}:${options.quality ?? 82}:${format}`)
    .digest('hex')
    .slice(0, 16);
  const basename = path.basename(sourcePath, sourceExtension).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
  const outputPath = path.join(outputRoot.path, `${basename}-${fingerprint}.${extension}`);
  if (!await fileExists(outputPath)) {
    let pipeline = input.resize({ width: targetWidth, withoutEnlargement: true });
    if (format === 'avif') {
      pipeline = pipeline.avif({ quality: options.quality ?? 82, effort: 4 });
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality: options.quality ?? 82 });
    } else if (format === 'original') {
      if (sourceExtension === '.jpg' || sourceExtension === '.jpeg') {
        pipeline = pipeline.jpeg({ quality: options.quality ?? 82, mozjpeg: true });
      } else if (sourceExtension === '.png') {
        pipeline = pipeline.png({ compressionLevel: 9, effort: 6 });
      } else if (sourceExtension === '.gif') {
        pipeline = pipeline.gif();
      } else if (sourceExtension === '.tif' || sourceExtension === '.tiff') {
        pipeline = pipeline.tiff({ compression: 'lzw' });
      } else if (sourceExtension === '.avif') {
        pipeline = pipeline.avif({ quality: options.quality ?? 82, effort: 4 });
      } else {
        pipeline = pipeline.webp({ quality: options.quality ?? 82 });
      }
    } else {
      pipeline = pipeline.webp({ quality: options.quality ?? 82 });
    }
    await mkdir(outputRoot.path, { recursive: true });
    await writeFile(outputPath, await pipeline.toBuffer());
  }
  return `${outputRoot.publicPath}/${encodeURIComponent(path.basename(outputPath))}`;
}

async function resolveSourcePaths(pathname: string, options: SvedocsImageOptimizationOptions): Promise<string[]> {
  const clean = decodeURIComponent(pathname);
  const candidates = clean.startsWith('/')
    ? [path.join(options.projectRoot, 'static', clean), path.join(options.projectRoot, clean)]
    : [path.join(options.projectRoot, path.dirname(options.sourcePath ?? ''), clean), path.join(options.projectRoot, 'static', clean)];
  return candidates.filter((candidate) => isWithin(options.projectRoot, candidate));
}

function resolveOutputRoot(options: SvedocsImageOptimizationOptions): { path: string; publicPath: string } | undefined {
  const outputDir = options.outputDir ?? 'static/_svedocs/images';
  const staticRoot = path.resolve(options.projectRoot, 'static');
  const outputPath = path.resolve(options.projectRoot, outputDir);
  if (!isWithin(staticRoot, outputPath)) return undefined;
  const relative = normalizePath(path.relative(staticRoot, outputPath));
  return { path: outputPath, publicPath: relative ? `/${relative}` : '' };
}

function outputExtension(format: SvedocsImageOptimizationOptions['format'], sourceExtension: string): string {
  if (format === 'avif') return 'avif';
  if (format === 'webp' || !format) return 'webp';
  return sourceExtension.slice(1) || 'bin';
}

function displayWidth(properties: ImageProperties | undefined): number | undefined {
  if (!properties) return undefined;
  const width = numeric(properties.width)
    ?? numeric(properties['data-display-width'])
    ?? numeric(properties.dataDisplayWidth);
  if (width) return width;
  const style = typeof properties.style === 'string' ? /(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i.exec(properties.style)?.[1] : undefined;
  if (style) return Number(style);
  const title = typeof properties.title === 'string' ? properties.title.trim() : '';
  const match = /^(?:=\s*)?(\d+)(?:x\d+)?$/i.exec(title);
  return match?.[1] ? Number(match[1]) : undefined;
}

function numeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+(?:\.\d+)?(?:px)?$/i.test(value.trim())) return Number.parseFloat(value);
  return undefined;
}

function isLocalImagePath(pathname: string): boolean {
  if (!pathname || pathname.startsWith('//') || pathname.startsWith('/') && pathname.includes('://')) return false;
  if (/^(?:https?:|data:|blob:|mailto:|tel:)/i.test(pathname)) return false;
  return rasterExtensions.has(path.extname(pathname).toLowerCase());
}

function splitUrlSuffix(href: string): { pathname: string; suffix: string } {
  const match = /([?#].*)$/.exec(href);
  return match?.index !== undefined
    ? { pathname: href.slice(0, match.index), suffix: match[0] }
    : { pathname: href, suffix: '' };
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function normalizePath(value: string): string {
  return value.split(path.sep).join('/');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function loadSharp(): any | undefined {
  try {
    const module = requireFromPackage('sharp');
    return module.default ?? module;
  } catch {
    return undefined;
  }
}
