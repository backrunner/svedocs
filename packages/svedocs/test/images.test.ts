import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { resolveSvedocsConfig } from '../src/core/config.js';
import { compileMarkdown } from '../src/mdx/compile.js';
import { transformSvedocsImageComponents } from '../src/mdx/images.js';

describe('svedocs image optimization', () => {
  it('enables width-limited WebP optimization by default', () => {
    expect(resolveSvedocsConfig().images).toMatchObject({
      enabled: true,
      maxWidth: 880,
      quality: 82,
      format: 'webp',
      outputDir: 'static/_svedocs/images'
    });
  });

  it('creates a width-limited local image and keeps URL suffixes', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'svedocs-images-'));
    try {
      await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#0f766e' } })
        .png()
        .toFile(path.join(projectRoot, 'source.png'));
      const result = await compileMarkdown('![Preview](/source.png?cache=1)', {
        imageOptimization: {
          projectRoot,
          maxWidth: 640,
          quality: 80,
          format: 'webp',
          outputDir: 'static/_svedocs/images',
          enabled: true
        }
      });
      expect(result.html).toMatch(/src="\/_svedocs\/images\/source-[a-f0-9]+\.webp\?cache=1"/);
      const optimized = result.html.match(/src="([^"]+)"/)?.[1]?.split('?')[0];
      expect(optimized).toBeTruthy();
      const metadata = await sharp(await readFile(path.join(projectRoot, 'static', optimized!.slice(1)))).metadata();
      expect(metadata.width).toBe(640);
      expect(metadata.format).toBe('webp');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('uses the displayed width and preserves the source format when requested', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'svedocs-images-'));
    try {
      await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#2563eb' } })
        .png()
        .toFile(path.join(projectRoot, 'source.png'));
      const result = await compileMarkdown('<img src="/source.png" width="320" alt="Preview" />', {
        imageOptimization: {
          projectRoot,
          maxWidth: 880,
          format: 'original',
          outputDir: 'static/_svedocs/images',
          enabled: true
        }
      });
      const optimized = result.html.match(/src="([^"]+)"/)?.[1];
      expect(optimized).toMatch(/^\/_svedocs\/images\/source-[a-f0-9]+\.png$/);
      const metadata = await sharp(await readFile(path.join(projectRoot, 'static', optimized!.slice(1)))).metadata();
      expect(metadata.width).toBe(320);
      expect(metadata.format).toBe('png');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('rounds fractional displayed widths before resizing', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'svedocs-images-'));
    try {
      await sharp({ create: { width: 800, height: 450, channels: 3, background: '#7c3aed' } })
        .png()
        .toFile(path.join(projectRoot, 'source.png'));
      const result = await compileMarkdown('<img src="/source.png" style="width: 320.5px" alt="Preview" />', {
        imageOptimization: {
          projectRoot,
          maxWidth: 880,
          format: 'webp',
          outputDir: 'static/_svedocs/images',
          enabled: true
        }
      });
      const optimized = result.html.match(/src="([^\"]+)"/)?.[1];
      expect(optimized).toMatch(/^\/_svedocs\/images\/source-[a-f0-9]+\.webp$/);
      const metadata = await sharp(await readFile(path.join(projectRoot, 'static', optimized!.slice(1)))).metadata();
      expect(metadata.width).toBe(321);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('leaves external and explicitly skipped images untouched', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'svedocs-images-'));
    try {
      await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#dc2626' } })
        .png()
        .toFile(path.join(projectRoot, 'source.png'));
      const result = await compileMarkdown([
        '![External](https://cdn.example.com/image.png)',
        '![Skipped](/source.png "no-compress")',
        '<img src="/source.png" data-svedocs-no-compress />'
      ].join('\n\n'), {
        imageOptimization: {
          projectRoot,
          maxWidth: 640,
          enabled: true
        }
      });
      expect(result.html).toContain('src="https://cdn.example.com/image.png"');
      expect(result.html).toContain('src="/source.png"');
      expect(result.html).toContain('data-svedocs-no-compress');
      expect(result.html).not.toContain('/_svedocs/images/');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it('rewrites static SvedocsImage component sources for custom Svelte pages', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'svedocs-images-'));
    try {
      await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#0891b2' } })
        .png()
        .toFile(path.join(projectRoot, 'hero.png'));
      const source = '<SvedocsImage src="/hero.png" width={640} alt="Hero" />';
      const transformed = await transformSvedocsImageComponents(source, {
        projectRoot,
        sourcePath: 'src/routes/+page.svelte',
        maxWidth: 880,
        quality: 82,
        format: 'webp',
        outputDir: 'static/_svedocs/images',
        enabled: true
      });
      expect(transformed).toMatch(/src="\/_svedocs\/images\/hero-[a-f0-9]+\.webp"/);
      expect(transformed).toContain('width={640}');
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
