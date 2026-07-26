import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadSvedocsConfig } from 'svedocs/config';
import { createOgImage, createOgImageInput, createPageOgImagePath } from 'svedocs/og';
import { loadProjectManifest } from '../project.js';
import { fail, ok, type CliResult } from '../result.js';
import { readOgFonts, readOption } from '../utils.js';

export async function runOgCommand(args: string[]): Promise<CliResult> {
  const manifest = await loadProjectManifest({ configFile: readOption(args, '--config') });
  const out = path.resolve(process.cwd(), readOption(args, '--out') ?? (manifest.config.seo.ogImage === false ? 'static/og' : manifest.config.seo.ogImage.outDir));
  const format = readOption(args, '--format') ?? (manifest.config.seo.ogImage === false ? 'svg' : manifest.config.seo.ogImage.format);
  const renderer = readOption(args, '--renderer') ?? (manifest.config.seo.ogImage === false ? 'svg' : manifest.config.seo.ogImage.renderer);
  if (!['svg', 'png'].includes(format)) {
    return fail('og', args, 'Invalid OG format. Use svg or png.');
  }
  if (!['svg', 'satori'].includes(renderer)) {
    return fail('og', args, 'Invalid OG renderer. Use svg or satori.');
  }
  const fonts = await readOgFonts(args);
  if (renderer === 'satori' && fonts.length === 0) {
    return fail('og', args, 'Satori OG rendering requires at least one --font path.');
  }
  const configFile = readOption(args, '--config');
  return generateOgAssets({
    args,
    out,
    format,
    renderer,
    fonts,
    ...(configFile ? { configFile } : {})
  });
}

export async function runConfiguredOgGeneration(
  configFile: string | undefined,
  buildArgs: string[],
  ogConfig: ReturnType<typeof loadSvedocsConfig>['seo']['ogImage']
): Promise<CliResult | undefined> {
  if (buildArgs.includes('--no-og')) return undefined;
  if (ogConfig === false) return undefined;
  if (ogConfig.renderer === 'satori') return undefined;
  const manifest = await loadProjectManifest({ configFile });
  return generateOgAssets({
    args: ['og', '--auto'],
    out: path.resolve(process.cwd(), ogConfig.outDir),
    format: ogConfig.format,
    renderer: ogConfig.renderer,
    fonts: [],
    ...(configFile ? { configFile } : {}),
    manifest
  });
}

async function generateOgAssets(input: {
  args: string[];
  out: string;
  format: string;
  renderer: string;
  fonts: Awaited<ReturnType<typeof readOgFonts>>;
  configFile?: string;
  manifest?: Awaited<ReturnType<typeof loadProjectManifest>>;
}): Promise<CliResult> {
  const manifest = input.manifest ?? await loadProjectManifest({ configFile: input.configFile });
  const { out, format, renderer, fonts, args } = input;
  await mkdir(out, { recursive: true });
  const written: string[] = [];
  const destinations = new Set<string>();
  for (const page of manifest.pages) {
    if (page.hidden) continue;
    const fileName = createPageOgImagePath(page, format as 'svg' | 'png').replace(/^\/og\//, '');
    const destination = path.join(out, fileName);
    if (destinations.has(destination)) return fail('og', args, `Duplicate OG output path: ${destination}`);
    destinations.add(destination);
    const asset = await createOgImage(createOgImageInput(manifest.config, page), {
      format: format as 'svg' | 'png',
      renderer: renderer as 'svg' | 'satori',
      ...(manifest.config.seo.ogImage !== false && typeof manifest.config.seo.ogImage.template === 'function'
        ? { template: manifest.config.seo.ogImage.template }
        : {}),
      ...(fonts.length ? { fonts } : {})
    });
    await writeFile(destination, asset);
    written.push(destination);
  }
  return ok('og', args, `Generated ${written.length} OG ${format.toUpperCase()} files with ${renderer} renderer in ${out}`);
}
