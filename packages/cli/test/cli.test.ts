import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectPackageManagerFromEnv } from '../src/package-manager';
import { runCreateSvedocsCli, runSvedocsCli } from '../src/index';

process.env.SVEDOCS_TEMPLATE_SOURCE = 'bundled';

describe('svedocs-cli Batch 0 shell', () => {
  it('renders svedocs help', async () => {
    const result = await runSvedocsCli(['--help']);

    expect(result.ok).toBe(true);
    expect(result.message).toContain('svedocs');
    expect(result.message).toContain('upgrade');
    expect(result.message).toContain('ssg');
  });

  it('renders create-svedocs help', async () => {
    const result = await runCreateSvedocsCli(['--help']);

    expect(result.ok).toBe(true);
    expect(result.message).toContain('create-svedocs');
  });

  it('renders upgrade help', async () => {
    const result = await runSvedocsCli(['upgrade', '--help']);

    expect(result.ok).toBe(true);
    expect(result.message).toContain('svedocs upgrade');
    expect(result.message).toContain('--check-only');
  });

  it('dry-runs svedocs upgrades without editing package.json', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-upgrade-dry-run-'));
    try {
      const packageJsonPath = path.join(tmp, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify({
        name: 'upgrade-app',
        dependencies: { svedocs: '^0.1.0' }
      }, null, 2), 'utf8');

      const result = await withCwd(tmp, () => runSvedocsCli(['upgrade', '0.2.0', '--dry-run']));
      const packageJson = await readFile(packageJsonPath, 'utf8');

      expect(result.ok).toBe(true);
      expect(result.message).toContain('svedocs upgrade dry-run');
      expect(result.message).toContain('dependencies.svedocs: ^0.1.0 -> ^0.2.0');
      expect(result.message).toContain('devDependencies.svedocs-cli: (missing) -> 0.2.0');
      expect(packageJson).toContain('"svedocs": "^0.1.0"');
      expect(packageJson).not.toContain('svedocs-cli');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rewrites svedocs dependencies when install is skipped', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-upgrade-no-install-'));
    try {
      const packageJsonPath = path.join(tmp, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify({
        name: 'upgrade-app',
        dependencies: { svedocs: '^0.1.0' },
        devDependencies: { 'svedocs-cli': '^0.1.0' }
      }, null, 2), 'utf8');

      const result = await withCwd(tmp, () => runSvedocsCli(['upgrade', '0.2.0', '--no-install']));
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      expect(result.ok).toBe(true);
      expect(result.message).toContain('Updated');
      expect(result.message).toContain('No breaking upgrade rules are registered yet');
      expect(packageJson.dependencies?.svedocs).toBe('^0.2.0');
      expect(packageJson.devDependencies?.['svedocs-cli']).toBe('^0.2.0');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('checks upgrade compatibility without changing dependencies', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-upgrade-check-'));
    try {
      const packageJsonPath = path.join(tmp, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify({
        name: 'upgrade-app',
        dependencies: { svedocs: 'latest' },
        devDependencies: { 'svedocs-cli': 'latest' }
      }, null, 2), 'utf8');

      const result = await withCwd(tmp, () => runSvedocsCli(['upgrade', '--check-only']));
      const packageJson = await readFile(packageJsonPath, 'utf8');

      expect(result.ok).toBe(true);
      expect(result.message).toContain('svedocs upgrade check');
      expect(result.message).toContain('Target "latest" is not a concrete version');
      expect(packageJson).toContain('"svedocs": "latest"');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('creates complete minimal and cloudflare templates', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-create-'));
    const previous = process.cwd();
    process.chdir(tmp);
    try {
      const runtime = fakePackageManagers({ pnpm: '11.1.2' });
      const minimal = await runCreateSvedocsCli(['minimal-app', '--template', 'minimal'], runtime);
      const cloudflare = await runCreateSvedocsCli(['edge-app', '--template', 'cloudflare'], runtime);
      const minimalConfig = await readFile(path.join(tmp, 'minimal-app', 'svedocs.config.ts'), 'utf8');
      const minimalPackage = await readFile(path.join(tmp, 'minimal-app', 'package.json'), 'utf8');
      const minimalSvelteConfig = await readFile(path.join(tmp, 'minimal-app', 'svelte.config.js'), 'utf8');
      const minimalPageRoute = await readFile(path.join(tmp, 'minimal-app', 'src/routes/+page.ts'), 'utf8');
      const minimalErrorRoute = await readFile(path.join(tmp, 'minimal-app', 'src/routes/+error.svelte'), 'utf8');
      const cloudflareWrangler = await readFile(path.join(tmp, 'edge-app', 'wrangler.toml'), 'utf8');
      const cloudflareSvelteConfig = await readFile(path.join(tmp, 'edge-app', 'svelte.config.js'), 'utf8');
      const cloudflarePageRoute = await readFile(path.join(tmp, 'edge-app', 'src/routes/+page.ts'), 'utf8');
      const cloudflareErrorRoute = await readFile(path.join(tmp, 'edge-app', 'src/routes/+error.svelte'), 'utf8');
      const cloudflareRobotsRoute = await readFile(path.join(tmp, 'edge-app', 'src/routes/robots.txt/+server.ts'), 'utf8');
      const cloudflareSitemapRoute = await readFile(path.join(tmp, 'edge-app', 'src/routes/sitemap.xml/+server.ts'), 'utf8');
      const cloudflareOgRoute = await readFile(path.join(tmp, 'edge-app', 'src/routes/og/[...path]/+server.ts'), 'utf8');
      const cloudflareSearchApi = await readFile(path.join(tmp, 'edge-app', 'src/routes/api/search/+server.ts'), 'utf8');
      const cloudflareApi = await readFile(path.join(tmp, 'edge-app', 'src/routes/api/ask/+server.ts'), 'utf8');
      const cloudflareDevVars = await readFile(path.join(tmp, 'edge-app', '.dev.vars.example'), 'utf8');

      expect(minimal.ok).toBe(true);
      expect(cloudflare.ok).toBe(true);
      expect(minimalConfig).toContain('defineConfig');
      expect(minimalPackage).toContain('"name": "minimal-app"');
      expect(minimalPackage).toContain('"packageManager": "pnpm@11.1.2"');
      expect(minimalPackage).toContain('"build:ssg": "svedocs ssg"');
      expect(minimalPackage).toContain('"svedocs-cli": "latest"');
      expect(minimalSvelteConfig).toContain('remoteBindings: false');
      expect(minimalSvelteConfig).toContain("fallback: '200.html'");
      expect(minimalPageRoute).toContain('svedocsPagePrerender');
      expect(minimalErrorRoute).toContain('themeComponents.Error ?? ErrorPage');
      expect(minimalErrorRoute).toContain('virtual:svedocs/theme-components');
      expect(await readFile(path.join(tmp, 'minimal-app', 'src/routes/+layout.ts'), 'utf8')).toContain('svedocsTrailingSlash');
      expect(cloudflareWrangler).toContain('pages_build_output_dir');
      expect(cloudflareWrangler).toContain('[[ai_search]]');
      expect(cloudflareSvelteConfig).toContain('remoteBindings: false');
      expect(cloudflareSvelteConfig).toContain("fallback: '200.html'");
      expect(cloudflarePageRoute).toContain('svedocsPagePrerender');
      expect(cloudflareErrorRoute).toContain('themeComponents.Error ?? ErrorPage');
      expect(cloudflareErrorRoute).toContain('virtual:svedocs/theme-components');
      expect(cloudflareRobotsRoute).toContain('export const prerender = config.seo.robots');
      expect(cloudflareRobotsRoute).toContain('createRobotsResponse');
      expect(cloudflareSitemapRoute).toContain('export const prerender = config.seo.sitemap');
      expect(cloudflareSitemapRoute).toContain('createSitemapResponse');
      expect(cloudflareOgRoute).toContain('createConfiguredPageOgImageEntries');
      expect(cloudflareOgRoute).toContain('export const prerender = isOgImageEnabled(config)');
      expect(cloudflareSearchApi).toContain('createConfiguredSearchResponse');
      expect(cloudflareApi).toContain('createConfiguredAskResponse');
      expect(cloudflareDevVars).toContain('ALGOLIA_APP_ID=');
      expect(cloudflareDevVars).toContain('TYPESENSE_HOST=');
      expect(cloudflareDevVars).toContain('OPENAI_COMPATIBLE_API_KEY=');
    } finally {
      process.chdir(previous);
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects package managers from create command user agents', () => {
    expect(detectPackageManagerFromEnv({ npm_config_user_agent: 'pnpm/11.1.2 npm/? node/v24.0.0' })).toBe('pnpm');
    expect(detectPackageManagerFromEnv({ npm_config_user_agent: 'npm/11.6.2 node/v24.0.0' })).toBe('npm');
    expect(detectPackageManagerFromEnv({ npm_config_user_agent: 'yarn/4.12.0 npm/? node/v24.0.0' })).toBe('yarn');
    expect(detectPackageManagerFromEnv({ npm_config_user_agent: 'bun/1.3.0 npm/? node/v24.0.0' })).toBe('bun');
  });

  it('uses the invoking package manager and falls back when pnpm is unavailable', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-pm-'));
    const previous = process.cwd();
    process.chdir(tmp);
    try {
      const npmCreated = await runCreateSvedocsCli(['npm-app', '--template', 'minimal'], {
        env: { npm_config_user_agent: 'npm/11.6.2 node/v24.0.0' },
        ...fakePackageManagers({ pnpm: '11.1.2', npm: '11.6.2' })
      });
      const fallbackCreated = await runCreateSvedocsCli(['fallback-app', '--template', 'minimal'], fakePackageManagers({ npm: '11.6.2' }));
      const explicitCreated = await runCreateSvedocsCli([
        'explicit-app',
        '--template',
        'minimal',
        '--package-manager',
        'bun'
      ], fakePackageManagers({ bun: '1.3.0', pnpm: '11.1.2' }));
      const npmPackage = await readFile(path.join(tmp, 'npm-app', 'package.json'), 'utf8');
      const fallbackPackage = await readFile(path.join(tmp, 'fallback-app', 'package.json'), 'utf8');
      const explicitPackage = await readFile(path.join(tmp, 'explicit-app', 'package.json'), 'utf8');

      expect(npmCreated.ok).toBe(true);
      expect(npmCreated.message).toContain('npm 11.6.2 detected');
      expect(npmPackage).toContain('"packageManager": "npm@11.6.2"');
      expect(fallbackCreated.ok).toBe(true);
      expect(fallbackCreated.message).toContain('npm 11.6.2 selected as fallback');
      expect(fallbackPackage).toContain('"packageManager": "npm@11.6.2"');
      expect(explicitCreated.ok).toBe(true);
      expect(explicitCreated.message).toContain('bun 1.3.0 selected by --package-manager');
      expect(explicitPackage).toContain('"packageManager": "bun@1.3.0"');
    } finally {
      process.chdir(previous);
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('exposes create as a svedocs subcommand and protects non-empty directories', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-create-subcommand-'));
    const previous = process.cwd();
    process.chdir(tmp);
    try {
      const created = await runSvedocsCli(['create', 'docs-app', '--template', 'docs']);
      const blocked = await runCreateSvedocsCli(['docs-app', '--template', 'docs']);
      const forced = await runCreateSvedocsCli(['docs-app', '--template', 'docs', '--force']);

      expect(created.ok).toBe(true);
      expect(blocked.ok).toBe(false);
      expect(blocked.message).toContain('already exists');
      expect(forced.ok).toBe(true);
    } finally {
      process.chdir(previous);
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('can fetch create templates from GitHub when requested', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-github-template-'));
    const previous = process.cwd();
    const fetched: string[] = [];
    process.chdir(tmp);
    try {
      const fetchTemplate: typeof fetch = async (input) => {
        const url = String(input);
        fetched.push(url);
        if (url.includes('/git/trees/')) {
          return Response.json({
            tree: [
              { path: 'packages/cli/templates/minimal/package.json', type: 'blob' },
              { path: 'packages/cli/templates/minimal/README.md', type: 'blob' },
              { path: 'packages/cli/templates/docs/package.json', type: 'blob' }
            ]
          });
        }
        if (url.endsWith('/packages/cli/templates/minimal/package.json')) {
          return Response.json({
            name: 'template-name',
            scripts: { dev: 'vite', build: 'svedocs build', 'build:ssg': 'svedocs ssg' },
            dependencies: { svedocs: 'latest', 'svedocs-cli': 'latest' }
          });
        }
        if (url.endsWith('/packages/cli/templates/minimal/README.md')) {
          return new Response('Remote template readme');
        }
        return new Response('Not found', { status: 404, statusText: 'Not Found' });
      };

      const created = await runCreateSvedocsCli(['remote-app', '--template', 'minimal'], {
        env: {
          SVEDOCS_TEMPLATE_SOURCE: 'github',
          SVEDOCS_TEMPLATE_REPOSITORY: 'example/docs',
          SVEDOCS_TEMPLATE_REF: 'template-ref'
        },
        fetch: fetchTemplate,
        ...fakePackageManagers({ pnpm: '11.1.2' })
      });
      const packageJson = await readFile(path.join(tmp, 'remote-app', 'package.json'), 'utf8');
      const readme = await readFile(path.join(tmp, 'remote-app', 'README.md'), 'utf8');

      expect(created.ok).toBe(true);
      expect(created.message).toContain('Template source: GitHub example/docs@template-ref.');
      expect(packageJson).toContain('"name": "remote-app"');
      expect(readme).toBe('Remote template readme');
      expect(fetched.some((url) => url.includes('api.github.com/repos/example/docs/git/trees/template-ref'))).toBe(true);
    } finally {
      process.chdir(previous);
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('resolves templates from the bundled dist CLI layout', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-bundled-create-'));
    try {
      await runCommand('pnpm', ['--filter', 'svedocs-cli', 'build'], repoRoot());
      await runCommand(
        'node',
        [fileURLToPath(new URL('fixtures/bundled-create.mjs', import.meta.url)), path.join(tmp, 'app')],
        repoRoot()
      );
      const packageJson = await readFile(path.join(tmp, 'app', 'package.json'), 'utf8');

      expect(packageJson).toContain('"name": "app"');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }, 15_000);

  it('checks a fixture project with section search records', async () => {
    const result = await withCwd(fixtureRoot(), () => runSvedocsCli(['check']));

    expect(result.ok).toBe(true);
    expect(result.message).toContain('3 pages');
    expect(result.message).toContain('0 errors');
  });

  it('can skip local asset checks from the CLI', async () => {
    const failing = await withCwd(checksFixtureRoot(), () => runSvedocsCli(['check']));
    const skipped = await withCwd(checksFixtureRoot(), () => runSvedocsCli(['check', '--no-assets']));

    expect(failing.ok).toBe(false);
    expect(failing.message).toContain('broken-asset');
    expect(skipped.ok).toBe(true);
    expect(skipped.message).toContain('0 errors');
  });

  it('writes jsonl search indexes', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-cli-'));
    try {
      const result = await withCwd(fixtureRoot(), () => runSvedocsCli(['index', '--format', 'jsonl', '--out', path.join(tmp, 'search.jsonl')]));
      const output = await readFile(path.join(tmp, 'search.jsonl'), 'utf8');

      expect(result.ok).toBe(true);
      expect(output).toContain('"section":"Install"');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('dry-runs Cloudflare AI Search indexing without credentials', async () => {
    const result = await withCwd(fixtureRoot(), () => runSvedocsCli([
      'index',
      '--provider',
      'cloudflare-ai-search',
      '--dry-run'
    ]));

    expect(result.ok).toBe(true);
    expect(result.message).toContain('Cloudflare AI Search dry-run');
    expect(result.message).toContain('uploads');
    expect(result.message).toContain('Strategy: append');
  });

  it('dry-runs Cloudflare AI Search replace deletes', async () => {
    const result = await withCwd(fixtureRoot(), () => runSvedocsCli([
      'index',
      '--provider',
      'cloudflare-ai-search',
      '--dry-run',
      '--strategy',
      'replace',
      '--existing',
      'stale,content-docs-guide:page',
      '--delete',
      'manual-delete'
    ]));

    expect(result.ok).toBe(true);
    expect(result.message).toContain('uploads and 2 deletes planned');
    expect(result.message).toContain('Strategy: replace');
  });

  it('generates OG svg assets', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-og-'));
    try {
      const result = await withCwd(fixtureRoot(), () => runSvedocsCli(['og', '--out', tmp]));
      const output = await readFile(path.join(tmp, 'docs-guide.svg'), 'utf8');

      expect(result.ok).toBe(true);
      expect(output).toContain('<svg');
      expect(output).toContain('Guide');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('generates OG png assets', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-og-png-'));
    try {
      const result = await withCwd(fixtureRoot(), () => runSvedocsCli(['og', '--format', 'png', '--out', tmp]));
      const output = await readFile(path.join(tmp, 'docs-guide.png'));

      expect(result.ok).toBe(true);
      expect([...output.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }, 15000);

  it('runs configured OG generation before invoking vite build', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-build-og-'));
    try {
      const fixture = fixtureRoot();
      const binDir = path.join(tmp, 'bin');
      await mkdir(binDir, { recursive: true });
      await writeFile(
        path.join(binDir, 'vite'),
        '#!/usr/bin/env node\nprocess.exit(0);\n',
        { mode: 0o755 }
      );
      const previousPath = process.env.PATH;
      process.env.PATH = `${binDir}${path.delimiter}${previousPath ?? ''}`;
      try {
        const result = await withCwd(fixture, () => runSvedocsCli(['build', '--mode', 'static', '--outDir', 'custom-build']));
        const output = await readFile(path.join(fixture, 'static/og/docs-guide.svg'), 'utf8');

        expect(result.ok).toBe(true);
        expect(result.message).toContain('Generated 3 OG SVG files');
        expect(output).toContain('<svg');
      } finally {
        process.env.PATH = previousPath;
        await rm(path.join(fixture, 'static'), { recursive: true, force: true });
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('can skip automatic OG generation during build', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-build-no-og-'));
    try {
      const fixture = fixtureRoot();
      const binDir = path.join(tmp, 'bin');
      await mkdir(binDir, { recursive: true });
      await writeFile(
        path.join(binDir, 'vite'),
        '#!/usr/bin/env node\nprocess.exit(0);\n',
        { mode: 0o755 }
      );
      const previousPath = process.env.PATH;
      process.env.PATH = `${binDir}${path.delimiter}${previousPath ?? ''}`;
      try {
        const result = await withCwd(fixture, () => runSvedocsCli(['build', '--mode', 'static', '--no-og']));

        expect(result.ok).toBe(true);
        expect(result.message).not.toContain('Generated');
      } finally {
        process.env.PATH = previousPath;
        await rm(path.join(fixture, 'static'), { recursive: true, force: true });
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('requires fonts for Satori OG rendering', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-og-satori-'));
    try {
      const result = await withCwd(fixtureRoot(), () => runSvedocsCli(['og', '--renderer', 'satori', '--out', tmp]));

      expect(result.ok).toBe(false);
      expect(result.message).toContain('requires at least one --font');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('uses custom configured Satori OG templates when fonts are provided', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-og-satori-template-'));
    try {
      await mkdir(path.join(tmp, 'content/docs'), { recursive: true });
      await mkdir(path.join(tmp, 'content/pages'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/index.md'), '---\ndescription: Guide.\n---\n# Guide\n\nDocs.', 'utf8');
      await writeFile(path.join(tmp, 'content/pages/index.md'), '---\ndescription: Home.\n---\n# Home\n\nLanding.', 'utf8');
      await writeFile(
        path.join(tmp, 'svedocs.config.mjs'),
        [
          'export default {',
          '  seo: {',
          '    ogImage: {',
          '      renderer: "satori",',
          '      template: (input) => ({',
          '        type: "div",',
          '        props: {',
          '          style: { display: "flex", width: "1200px", height: "630px", background: "#123456", color: "#ffffff", fontFamily: "Inter", fontSize: 72 },',
          '          children: `Custom ${input.title}`',
          '        }',
          '      })',
          '    }',
          '  }',
          '};'
        ].join('\n'),
        'utf8'
      );
      const font = new URL('../../../node_modules/.pnpm/katex@0.16.47/node_modules/katex/dist/fonts/KaTeX_Main-Regular.ttf', import.meta.url).pathname;
      const result = await withCwd(tmp, () => runSvedocsCli(['og', '--renderer', 'satori', '--font', font, '--out', path.join(tmp, 'og')]));
      const output = await readFile(path.join(tmp, 'og', 'docs.svg'), 'utf8');

      expect(result.ok).toBe(true);
      expect(output).toContain('#123456');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('renders a Cloudflare deploy dry-run', async () => {
    const result = await withCwd(fixtureRoot(), () => runSvedocsCli(['deploy', 'cloudflare']));

    expect(result.ok).toBe(true);
    expect(result.message).toContain('wrangler.toml');
    expect(result.message).toContain('compatibility_date');
  });

  it('loads project svedocs config for deploy output', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-config-'));
    try {
      await mkdir(path.join(tmp, 'custom/docs'), { recursive: true });
      await mkdir(path.join(tmp, 'custom/pages'), { recursive: true });
      await writeFile(path.join(tmp, 'custom/docs/index.md'), '---\ndescription: Guide.\n---\n# Guide\n\nConfigured docs.', 'utf8');
      await writeFile(path.join(tmp, 'custom/pages/index.md'), '---\ndescription: Home.\n---\n# Home\n\nConfigured home.', 'utf8');
      await writeFile(
        path.join(tmp, 'svedocs.config.mjs'),
        [
          'export default {',
          '  site: { name: "configured-site" },',
          '  content: { root: "custom", docs: "custom/docs", pages: "custom/pages" },',
          '  search: { provider: "cloudflare-ai-search" },',
          '  ai: { provider: "cloudflare-ai-search" },',
          '  cloudflare: { aiSearch: { binding: "DOCS_SEARCH", instanceName: "configured-docs" } }',
          '};'
        ].join('\n'),
        'utf8'
      );

      const result = await withCwd(tmp, () => runSvedocsCli(['deploy', 'cloudflare']));

      expect(result.ok).toBe(true);
      expect(result.message).toContain('name = "configured-site"');
      expect(result.message).toContain('[[ai_search]]');
      expect(result.message).toContain('binding = "DOCS_SEARCH"');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('checks package exports when requested', async () => {
    const result = await withCwd(new URL('../../svedocs', import.meta.url).pathname, () => runSvedocsCli(['check', '--package']));

    expect(result.ok).toBe(true);
    expect(result.message).toContain('0 errors');
  });

  it.skipIf(process.env.SVEDOCS_TEMPLATE_E2E !== '1')('creates installable templates that pass check and build', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-template-e2e-'));
    const packDir = path.join(tmp, 'packs');
    const previous = process.cwd();
    try {
      await mkdir(packDir, { recursive: true });
      const svedocsTarball = await packWorkspacePackage('svedocs', packDir);
      const cliTarball = await patchCliTarballForLocalE2e(
        await packWorkspacePackage('svedocs-cli', packDir),
        svedocsTarball,
        packDir
      );
      for (const template of ['minimal', 'docs', 'cloudflare']) {
        process.chdir(tmp);
        const created = await runCreateSvedocsCli([template, '--template', template]);
        expect(created.ok).toBe(true);
        const target = path.join(tmp, template);
        const packageJsonPath = path.join(target, 'package.json');
        await rewriteTemplateDependencies(packageJsonPath, svedocsTarball, cliTarball);
        await runCommand('pnpm', ['install', '--ignore-scripts'], target);
        await runCommand('pnpm', ['check'], target);
        await runCommand('pnpm', ['build'], target);
      }
    } finally {
      process.chdir(previous);
      await rm(tmp, { recursive: true, force: true });
    }
  }, 240_000);
});

function fakePackageManagers(versions: Partial<Record<'pnpm' | 'npm' | 'yarn' | 'bun', string>>) {
  return {
    readPackageManagerVersion: async (name: 'pnpm' | 'npm' | 'yarn' | 'bun') => versions[name]
  };
}

async function packWorkspacePackage(filter: string, packDir: string): Promise<string> {
  const before = new Set(await readdir(packDir));
  await runCommand('pnpm', ['--filter', filter, 'pack', '--pack-destination', packDir], repoRoot());
  const created = (await readdir(packDir))
    .filter((file) => file.endsWith('.tgz') && !before.has(file))
    .sort();
  const tarball = created.at(-1);
  if (!tarball) throw new Error(`No tarball was created for ${filter}`);
  return path.join(packDir, tarball);
}

function repoRoot(): string {
  return new URL('../../..', import.meta.url).pathname;
}

async function patchCliTarballForLocalE2e(cliTarball: string, svedocsTarball: string, packDir: string): Promise<string> {
  const extractDir = path.join(packDir, 'cli-extract');
  const patchedTarball = path.join(packDir, 'svedocs-cli-local-e2e.tgz');
  await mkdir(extractDir, { recursive: true });
  await runCommand('tar', ['-xzf', cliTarball, '-C', extractDir], repoRoot());
  const packageJsonPath = path.join(extractDir, 'package', 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  packageJson.dependencies = {
    ...packageJson.dependencies,
    svedocs: `file:${svedocsTarball}`
  };
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
  await runCommand('tar', ['-czf', patchedTarball, '-C', extractDir, 'package'], repoRoot());
  return patchedTarball;
}

async function rewriteTemplateDependencies(packageJsonPath: string, svedocsTarball: string, cliTarball: string): Promise<void> {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  packageJson.dependencies = {
    ...packageJson.dependencies,
    svedocs: `file:${svedocsTarball}`
  };
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    'svedocs-cli': `file:${cliTarball}`
  };
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

function fixtureRoot(): string {
  return new URL('../../svedocs/test/fixtures/basic', import.meta.url).pathname;
}

function checksFixtureRoot(): string {
  return new URL('../../svedocs/test/fixtures/checks', import.meta.url).pathname;
}

async function withCwd<T>(cwd: string, callback: () => Promise<T>): Promise<T> {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return await callback();
  } finally {
    process.chdir(previous);
  }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: process.platform === 'win32'
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed in ${cwd} with ${code}:\n${output}`));
      }
    });
    child.on('error', reject);
  });
}
