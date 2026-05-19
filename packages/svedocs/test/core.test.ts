import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAskResponse, createCloudflareAiSearchAiProvider, createCloudflareKvRateLimiter, createConfiguredAiProvider, createConfiguredAskResponse, createMemoryRateLimiter, createMockAiProvider, createOpenAiCompatibleProvider, createWorkersAiProvider } from '../src/ai';
import { createCloudflareEnvDts, createWranglerJson } from '../src/cloudflare';
import { defineConfig } from '../src/config';
import { checkPackagePublication, createPageTree, createSearchRecords, flattenPageTree, loadSvedocsContent, resolveSvedocsConfig } from '../src/core';
import { createConfiguredOgImageFormat, createConfiguredOgImageTemplate, createOgPng, createPageAlternates, createPageMetadata, createPageOgImagePath, createPageOgImageResponse, createRobotsTxt, createSatoriOgSvg, createSitemapXml } from '../src/og';
import { compileMarkdown, createDiffRows, createDiffSplitRows } from '../src/mdx/compile';
import { createAlgoliaSearchProvider, createCloudflareAiSearchDocuments, createCloudflareAiSearchProvider, createConfiguredSearchProvider, createConfiguredSearchResponse, createSearchResponse, createTypesenseSearchProvider, searchRecords, syncCloudflareAiSearchIndex } from '../src/search';
import { createFixturePage } from '../src/testing';

describe('svedocs Batch 0 skeleton', () => {
  it('returns user config from defineConfig', () => {
    const config = defineConfig({ site: { name: 'Example' } });

    expect(config.site?.name).toBe('Example');
  });

  it('resolves default config values', () => {
    const config = resolveSvedocsConfig();

    expect(config.site.name).toBe('svedocs');
    expect(config.build.mode).toBe('edge');
    expect(config.theme.fonts.sans).toContain('IBM Plex Sans');
    expect(config.theme.codeTheme.dark).toBe('github-dark');
    expect(config.theme.brand).toMatchObject({ label: 'svedocs', href: '/', mark: 'pixel' });
    expect(config.theme.nav.map((item) => item.href)).toEqual(['/docs']);
    expect(config.theme.home.kicker).toBe('SvelteKit-native docs');
    expect(config.theme.footer && config.theme.footer.text).toContain('MIT licensed');
    expect(config.seo.ogImage && config.seo.ogImage.outDir).toBe('static/og');
    expect(config.seo.ogImage && config.seo.ogImage.format).toBe('svg');
    expect(config.search.scope).toBe('current');
    expect(config.ai.enabled).toBe(false);
    expect(config.ai.scope).toBe('current');
    expect(config.i18n.locales).toEqual([]);
    expect(config.versions.items).toEqual([]);
    expect(config.checks.translations).toBe(false);
    expect(config.checks.versionStatus).toBe(true);
  });

  it('resolves theme customization and SEO author defaults', () => {
    const config = resolveSvedocsConfig({
      theme: {
        fonts: {
          sans: 'Atkinson Hyperlegible, sans-serif',
          mono: 'Berkeley Mono, monospace'
        },
        radius: '6px',
        codeTheme: {
          light: 'github-light',
          dark: 'vitesse-dark'
        },
        brand: {
          label: 'Docs Lab',
          href: '/home',
          mark: false
        },
        nav: [
          { label: 'Guide', href: '/docs' },
          { label: 'GitHub', href: 'https://github.com/svedocs/svedocs', external: true }
        ],
        social: [
          { label: 'Discord', href: 'https://example.test/discord', external: true }
        ],
        footer: {
          text: 'Custom footer',
          links: [{ label: 'Legal', href: '/terms' }]
        },
        home: {
          kicker: 'Custom docs',
          primaryAction: { label: 'Start', href: '/docs' },
          visual: { type: 'image', src: '/hero.png', alt: 'Hero preview' }
        }
      },
      search: {
        scope: 'all'
      },
      ai: {
        scope: 'all'
      },
      seo: {
        defaultAuthor: 'svedocs team',
        ogImage: {
          format: 'png',
          outDir: 'static/custom-og',
          renderer: 'svg'
        }
      }
    });

    expect(config.theme.fonts.sans).toContain('Atkinson');
    expect(config.theme.radius).toBe('6px');
    expect(config.theme.codeTheme.dark).toBe('vitesse-dark');
    expect(config.theme.brand).toMatchObject({ label: 'Docs Lab', href: '/home', mark: false });
    expect(config.theme.nav[1]).toMatchObject({ external: true });
    expect(config.theme.social[0]).toMatchObject({ label: 'Discord' });
    expect(config.theme.footer && config.theme.footer.text).toBe('Custom footer');
    expect(config.theme.home.visual).toMatchObject({ type: 'image', src: '/hero.png', alt: 'Hero preview' });
    expect(config.search.scope).toBe('all');
    expect(config.ai.scope).toBe('all');
    expect(config.seo.defaultAuthor).toBe('svedocs team');
    expect(config.seo.ogImage && config.seo.ogImage.format).toBe('png');
    expect(config.seo.ogImage && config.seo.ogImage.outDir).toBe('static/custom-og');
  });

  it('resolves version lifecycle metadata', () => {
    const config = resolveSvedocsConfig({
      versions: {
        current: 'v1',
        items: [
          { name: 'v1', label: 'Latest' },
          { name: 'v2', label: 'Next', status: 'next' },
          { name: 'v0', label: 'Legacy', status: 'archived', banner: 'Legacy docs are frozen.' }
        ]
      }
    });

    expect(config.versions.items).toMatchObject([
      { name: 'v1', status: 'current' },
      { name: 'v2', status: 'next' },
      { name: 'v0', status: 'archived', banner: 'Legacy docs are frozen.' }
    ]);
  });

  it('creates Cloudflare Workers AI bindings when configured', () => {
    const config = resolveSvedocsConfig({
      ai: {
        provider: 'cloudflare-workers-ai'
      }
    });
    const wrangler = createWranglerJson(config);
    const dts = createCloudflareEnvDts(config);

    expect(config.ai.enabled).toBe(true);
    expect(wrangler.ai).toEqual({ binding: 'AI' });
    expect(dts).toContain('CloudflareWorkersAiBinding');
  });

  it('does not emit Cloudflare AI bindings when providers are explicitly disabled', () => {
    const config = resolveSvedocsConfig({
      search: {
        enabled: false,
        provider: 'cloudflare-ai-search'
      },
      ai: {
        enabled: false,
        provider: 'cloudflare-workers-ai'
      }
    });
    const wrangler = createWranglerJson(config);
    const dts = createCloudflareEnvDts(config);

    expect(wrangler.ai_search).toBeUndefined();
    expect(wrangler.ai).toBeUndefined();
    expect(dts).toContain('[key: string]: unknown');
  });

  it('creates Cloudflare AI Search bindings when configured', () => {
    const config = resolveSvedocsConfig({
      search: {
        provider: 'cloudflare-ai-search'
      },
      cloudflare: {
        aiSearch: {
          binding: 'DOCS_SEARCH',
          instanceName: 'docs'
        }
      }
    });
    const wrangler = createWranglerJson(config);
    const dts = createCloudflareEnvDts(config);

    expect(wrangler.ai_search).toEqual([
      {
        binding: 'DOCS_SEARCH',
        instance_name: 'docs',
        remote: false
      }
    ]);
    expect(wrangler.ai).toBeUndefined();
    expect(dts).toContain('DOCS_SEARCH: import(\'svedocs/search\').CloudflareAiSearchInstance;');
  });

  it('creates Cloudflare AI Search namespace bindings when configured', () => {
    const config = resolveSvedocsConfig({
      search: {
        provider: 'cloudflare-ai-search'
      },
      cloudflare: {
        aiSearch: {
          binding: 'DOCS_SEARCH_NAMESPACE',
          instanceName: 'docs',
          namespace: 'production-docs',
          remote: false
        }
      }
    });
    const wrangler = createWranglerJson(config);
    const dts = createCloudflareEnvDts(config);

    expect(wrangler.ai_search_namespaces).toEqual([
      {
        binding: 'DOCS_SEARCH_NAMESPACE',
        namespace: 'production-docs',
        remote: false
      }
    ]);
    expect(dts).toContain('DOCS_SEARCH_NAMESPACE: import(\'svedocs/search\').CloudflareAiSearchNamespace;');
  });

  it('creates a stable flat page tree', () => {
    const tree = createPageTree([
      createFixturePage({ id: 'b', title: 'B', routePath: '/b' }),
      createFixturePage({ id: 'a', title: 'A', routePath: '/a' })
    ]);

    expect(tree.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('collects search records from pages', () => {
    const records = createSearchRecords([
      createFixturePage({
        search: [
          {
            id: 'intro',
            pageId: 'index',
            url: '/',
            title: 'Intro',
            content: 'Hello',
            metadata: {}
          }
        ]
      })
    ]);

    expect(records).toHaveLength(1);
  });

  it('loads content from fixture files', async () => {
    const manifest = await loadSvedocsContent({
      projectRoot: new URL('fixtures/basic', import.meta.url).pathname,
      config: {
        content: {
          docs: 'content/docs',
          pages: 'content/pages'
        }
      }
    });

      expect(manifest.pages.map((page) => page.routePath)).toEqual(['/', '/docs/advanced/routing', '/docs/guide']);
    expect(flattenPageTree(manifest.tree).map((item) => item.path).filter(Boolean)).toEqual([
      '/docs/guide',
      '/docs/advanced/routing'
    ]);
    expect(manifest.search[0]?.content).toContain('SvelteKit native');
    expect(manifest.search.some((record) => record.section === 'Install')).toBe(true);
    expect(manifest.pages.find((page) => page.routePath === '/docs/guide')?.codeBlocks[0]).toMatchObject({
      language: 'ts',
      title: 'svedocs.config.ts',
      highlightLines: [1],
      focusLines: [2]
    });
      expect(manifest.issues).toEqual([]);
  });

  it('applies configured Markdown plugins during manifest compilation', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-md-plugins-'));
    try {
      await mkdir(path.join(tmp, 'content/docs'), { recursive: true });
      await mkdir(path.join(tmp, 'content/pages'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/index.md'), '---\ndescription: Guide.\n---\n# Guide\n\nBody.\n\n```ts\nexport const ok = true;\n```', 'utf8');
      await writeFile(path.join(tmp, 'content/pages/index.md'), '---\ndescription: Home.\n---\n# Home\n\nLanding.', 'utf8');

      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: {
          markdown: {
            remarkPlugins: [
              () => (tree: any) => {
                tree.children.push({
                  type: 'paragraph',
                  children: [{ type: 'text', value: 'Injected by remark.' }]
                });
              }
            ],
            rehypePlugins: [
              () => (tree: any) => {
                tree.children.push({
                  type: 'element',
                  tagName: 'div',
                  properties: { className: ['plugin-marker'] },
                  children: []
                });
              }
            ],
            shiki: {
              transformers: [
                {
                  name: 'svedocs-test-transformer',
                  pre(node: any) {
                    node.properties ??= {};
                    node.properties['data-transformer'] = 'yes';
                  }
                }
              ]
            }
          }
        }
      });

      const guide = manifest.pages.find((page) => page.routePath === '/docs');
      expect(guide?.html).toContain('Injected by remark.');
      expect(guide?.html).toContain('plugin-marker');
      expect(guide?.html).toContain('data-transformer="yes"');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('loads locale and version scoped docs', async () => {
    const manifest = await loadSvedocsContent({
      projectRoot: new URL('fixtures/i18n', import.meta.url).pathname,
      config: {
        site: {
          url: 'https://fixture.test'
        },
        i18n: {
          defaultLocale: 'en',
          locales: [
            { code: 'en', label: 'English' },
            { code: 'zh', label: '中文' }
          ]
        },
        versions: {
          current: 'v1',
          items: [
            { name: 'v1', label: 'Latest' },
            { name: 'v0', label: 'Legacy', status: 'archived', banner: 'Legacy docs are frozen.' }
          ]
        },
        checks: {
          versionStatus: false
        }
      }
    });

    expect(manifest.pages.map((page) => [page.routePath, page.locale, page.version])).toEqual([
      ['/docs', 'en', 'v1'],
      ['/docs/guide', 'en', 'v1'],
      ['/docs/v0/guide', 'en', 'v0'],
      ['/docs/zh', 'zh', 'v1']
    ]);
    expect(manifest.pages.find((page) => page.routePath === '/docs')?.next?.path).toBe('/docs/guide');
    expect(manifest.pages.find((page) => page.routePath === '/docs/v0/guide')?.prev).toBeUndefined();
    expect(manifest.search.find((record) => record.url === '/docs/zh')?.metadata).toMatchObject({
      locale: 'zh',
      version: 'v1'
    });
    expect(manifest.pages.find((page) => page.routePath === '/docs/v0/guide')).toMatchObject({
      versionLabel: 'Legacy',
      versionStatus: 'archived',
      versionBanner: 'Legacy docs are frozen.'
    });
    expect(createPageTree(manifest.pages.filter((page) => page.locale === 'zh' && page.version === 'v1'))).toEqual([
      {
        id: 'content-docs-zh-index',
        title: '中文文档',
        path: '/docs/zh',
        order: 1
      }
    ]);
    expect(createPageAlternates(
      manifest.config,
      manifest.pages.find((page) => page.routePath === '/docs')!,
      manifest.pages
    ).map((alternate) => [alternate.lang, alternate.href])).toEqual([
      ['en', 'https://fixture.test/docs'],
      ['zh', 'https://fixture.test/docs/zh'],
      ['x-default', 'https://fixture.test/docs']
    ]);
    expect(manifest.issues).toEqual([]);
  });

  it('reports missing translations and inactive version pages when enabled', async () => {
    const manifest = await loadSvedocsContent({
      projectRoot: new URL('fixtures/i18n', import.meta.url).pathname,
      config: {
        i18n: {
          defaultLocale: 'en',
          locales: [
            { code: 'en', label: 'English' },
            { code: 'zh', label: '中文' }
          ]
        },
        versions: {
          current: 'v1',
          items: [
            { name: 'v1', label: 'Latest' },
            { name: 'v0', label: 'Legacy', status: 'archived' }
          ]
        },
        checks: {
          translations: true
        }
      }
    });

    expect(manifest.issues.some((issue) => issue.code === 'missing-translation')).toBe(true);
    expect(manifest.issues.some((issue) => issue.code === 'deprecated-version' && issue.severity === 'info')).toBe(true);
  });

  it('checks local asset references and package exports', async () => {
    const manifest = await loadSvedocsContent({
      projectRoot: new URL('fixtures/checks', import.meta.url).pathname
    });
    const packageIssues = await checkPackagePublication(new URL('..', import.meta.url).pathname);

    expect(manifest.issues.some((issue) => issue.code === 'broken-asset' && issue.href === './missing.svg')).toBe(true);
    expect(manifest.issues.some((issue) => issue.code === 'broken-asset' && issue.href === './ok.svg')).toBe(false);
    expect(packageIssues).toEqual([]);
  });

  it('checks package bin targets', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-package-check-'));
    try {
      await mkdir(path.join(tmp, 'dist'), { recursive: true });
      await writeFile(path.join(tmp, 'dist/index.js'), 'export {};\n', 'utf8');
      await writeFile(path.join(tmp, 'README.md'), '# fixture\n', 'utf8');
      await writeFile(
        path.join(tmp, 'package.json'),
        JSON.stringify({
          name: 'fixture',
          type: 'module',
          license: 'MIT',
          publishConfig: {
            access: 'public',
            provenance: true
          },
          bin: {
            fixture: './dist/cli.js'
          },
          exports: {
            '.': './dist/index.js'
          },
          files: ['dist', 'README.md']
        }),
        'utf8'
      );

      const issues = await checkPackagePublication(tmp);

      expect(issues).toEqual([
        {
          code: 'package-bin-missing',
          severity: 'error',
          message: 'package.json bin target is missing: dist/cli.js.'
        }
      ]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('checks package release metadata', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-package-metadata-'));
    try {
      await mkdir(path.join(tmp, 'dist'), { recursive: true });
      await writeFile(path.join(tmp, 'dist/index.js'), 'export {};\n', 'utf8');
      await writeFile(path.join(tmp, 'package.json'), JSON.stringify({
        name: 'fixture',
        type: 'module',
        exports: {
          '.': './dist/index.js'
        },
        files: ['dist']
      }), 'utf8');

      const issues = await checkPackagePublication(tmp);

      expect(issues.map((issue) => issue.code)).toEqual([
        'package-license-missing',
        'package-publish-access-missing',
        'package-provenance-missing'
      ]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('does not require release metadata for private packages', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-private-package-'));
    try {
      await mkdir(path.join(tmp, 'dist'), { recursive: true });
      await writeFile(path.join(tmp, 'dist/index.js'), 'export {};\n', 'utf8');
      await writeFile(path.join(tmp, 'package.json'), JSON.stringify({
        name: 'fixture-private',
        private: true,
        type: 'module',
        exports: {
          '.': './dist/index.js'
        },
        files: ['dist']
      }), 'utf8');

      const issues = await checkPackagePublication(tmp);

      expect(issues).toEqual([]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('creates SEO metadata, sitemap, and robots output', async () => {
    const config = resolveSvedocsConfig({
      site: {
        name: 'Fixture',
        url: 'https://fixture.test'
      }
    });
      const page = createFixturePage({
        routePath: '/docs/guide',
        kind: 'doc',
        title: 'Guide',
        description: 'Read the guide.',
        lastUpdated: '2026-05-18T00:00:00.000Z',
        seo: {
          title: 'Guide',
          description: 'Read the guide.',
          canonical: 'https://fixture.test/docs/guide',
          author: 'Docs Team',
          publishedTime: '2026-05-17T00:00:00.000Z',
          type: 'article'
        }
      });

    const metadata = createPageMetadata(config, page);

      expect(metadata.title).toBe('Guide | Fixture');
      expect(metadata.openGraph.type).toBe('article');
      expect(metadata.openGraph.author).toBe('Docs Team');
      expect(metadata.openGraph.publishedTime).toBe('2026-05-17T00:00:00.000Z');
      expect(metadata.jsonLd.dateModified).toBe('2026-05-18T00:00:00.000Z');
      expect(metadata.openGraph.image).toBe('https://fixture.test/og/docs-guide.svg');
    expect(createPageOgImagePath(page)).toBe('/og/docs-guide.svg');
    expect((await createPageOgImageResponse(config, page)).headers.get('content-type')).toContain('image/svg+xml');
    expect(createSitemapXml(config, [page])).toContain('<loc>https://fixture.test/docs/guide</loc>');
    expect(createRobotsTxt(config)).toContain('Sitemap: https://fixture.test/sitemap.xml');
    expect(Array.from((await createOgPng({ title: 'Guide', description: 'Read the guide.' })).slice(0, 8))).toEqual([
      137,
      80,
      78,
      71,
      13,
      10,
      26,
      10
    ]);
    const font = await readFile(new URL('../../../node_modules/.pnpm/katex@0.16.47/node_modules/katex/dist/fonts/KaTeX_Main-Regular.ttf', import.meta.url));
    const satoriSvg = await createSatoriOgSvg(
      { title: 'Guide', description: 'Read the guide.' },
      { fonts: [{ name: 'Inter', data: font, weight: 400, style: 'normal' }] }
    );
    expect(satoriSvg).toContain('<svg');
    expect(satoriSvg).toContain('#11130f');
  });

  it('uses configured OG format for metadata and route responses', async () => {
    const config = resolveSvedocsConfig({
      site: {
        name: 'Fixture',
        url: 'https://fixture.test'
      },
      seo: {
        ogImage: {
          format: 'png',
          renderer: 'svg'
        }
      }
    });
    const page = createFixturePage({
      routePath: '/docs/guide',
      kind: 'doc',
      title: 'Guide',
      description: 'Read the guide.',
      seo: {
        title: 'Guide',
        description: 'Read the guide.',
        canonical: 'https://fixture.test/docs/guide'
      }
    });
    const metadata = createPageMetadata(config, page);
    const response = await createPageOgImageResponse(config, page);

    expect(createConfiguredOgImageFormat(config)).toBe('png');
    expect(metadata.openGraph.image).toBe('https://fixture.test/og/docs-guide.png');
    expect(createPageOgImagePath(page, createConfiguredOgImageFormat(config))).toBe('/og/docs-guide.png');
    expect(response.headers.get('content-type')).toContain('image/png');
  });

  it('preserves custom Satori OG template functions in resolved config', async () => {
    const template = (input: { title: string }) => ({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          width: '1200px',
          height: '630px',
          background: '#000',
          color: '#fff'
        },
        children: input.title
      }
    });
    const config = resolveSvedocsConfig({
      seo: {
        ogImage: {
          renderer: 'satori',
          template
        }
      }
    });

    expect(createConfiguredOgImageTemplate(config)).toBe(template);
  });

  it('searches records and renders API responses', async () => {
    const page = createFixturePage({
      search: [
        {
          id: 'intro:install',
          pageId: 'intro',
          url: '/docs#install',
          title: 'Intro',
          section: 'Install',
          content: 'Install svedocs with pnpm.',
          metadata: {}
        }
      ]
    });

    const results = searchRecords(page.search, { query: 'pnpm' });
    const response = await createSearchResponse(page.search, new Request('https://example.test/api/search?q=pnpm'));
    const json = await response.json() as { results: unknown[] };

    expect(results[0]?.section).toBe('Install');
    expect(json.results).toHaveLength(1);
  });

  it('ranks local search with scope filters', async () => {
    const records = [
      {
        id: 'en-install',
        pageId: 'install',
        url: '/docs/install',
        title: 'Install',
        content: 'Install svedocs with pnpm.',
        metadata: { locale: 'en', version: 'v1', kind: 'doc' }
      },
      {
        id: 'zh-install',
        pageId: 'zh-install',
        url: '/docs/zh/install',
        title: '安装',
        section: 'Cloudflare 部署',
        content: '使用 Cloudflare Pages 部署 svedocs。',
        metadata: { locale: 'zh', version: 'v1', kind: 'doc' }
      },
      {
        id: 'legacy-install',
        pageId: 'legacy-install',
        url: '/docs/v0/install',
        title: 'Legacy install',
        content: 'Old installation flow.',
        metadata: { locale: 'en', version: 'v0', kind: 'doc' }
      }
    ];
    const scoped = searchRecords(records, { query: 'cloudflare', locale: 'zh', version: 'v1' });
    const response = await createSearchResponse(
      records,
      new Request('https://example.test/api/search?q=install&locale=en&version=v0')
    );
    const json = await response.json() as { results: Array<{ id: string }> };

    expect(scoped.map((result) => result.id)).toEqual(['zh-install']);
    expect(searchRecords(records, { query: 'instal' })[0]?.id).toBe('en-install');
    expect(json.results.map((result) => result.id)).toEqual(['legacy-install']);
  });

  it('normalizes Cloudflare AI Search chunk results', async () => {
    const provider = createCloudflareAiSearchProvider({
      binding: {
        async search(input) {
          expect(input.query).toBeUndefined();
          return {
            response: `Matched ${input.messages?.[0]?.content ?? input.query}`,
            chunks: [
              {
                text: 'Install svedocs with pnpm.',
                score: 0.9,
                item: {
                  key: 'docs/install.md',
                  metadata: {
                    title: 'Install',
                    locale: 'en',
                    version: 'v1',
                    section: 'Package manager',
                    url: '/docs/install#package-manager'
                  }
                }
              },
              {
                text: '安装 svedocs。',
                score: 0.8,
                item: {
                  key: 'docs/zh/install.md',
                  metadata: {
                    svedocs: JSON.stringify({
                      title: '安装',
                      url: '/docs/zh/install'
                    }),
                    locale: 'zh',
                    version: 'v1'
                  }
                }
              }
            ]
          };
        }
      }
    });

    const results = await provider.search({ query: 'pnpm', limit: 1 });
    const scoped = await provider.search({ query: 'pnpm', locale: 'zh', version: 'v1' });

    expect(results[0]).toMatchObject({
      title: 'Install',
      url: '/docs/install#package-manager',
      section: 'Package manager',
      score: 0.9
    });
    expect(results[0]?.excerpt).toContain('pnpm');
    expect(scoped.map((result) => result.url)).toEqual(['/docs/zh/install']);
  });

  it('queries Algolia as an optional hosted search provider', async () => {
    let requestBody: { query?: string; hitsPerPage?: number; filters?: string } | undefined;
    const provider = createAlgoliaSearchProvider({
      appId: 'APP',
      apiKey: 'search-key',
      indexName: 'docs',
      filters: (query) => query.locale ? `locale:${query.locale}` : undefined,
      async fetch(input, init) {
        expect(String(input)).toContain('APP-dsn.algolia.net/1/indexes/docs/query');
        expect(init?.headers).toMatchObject({
          'x-algolia-application-id': 'APP',
          'x-algolia-api-key': 'search-key'
        });
        requestBody = JSON.parse(String(init?.body));
        return Response.json({
          hits: [
            {
              objectID: 'install',
              url: '/docs/install',
              anchor: 'package-manager',
              hierarchy: {
                lvl1: 'Install',
                lvl2: 'Package manager'
              },
              _snippetResult: {
                content: {
                  value: 'Install <mark>svedocs</mark> with pnpm.'
                }
              },
              locale: 'en',
              version: 'v1',
              kind: 'doc'
            }
          ]
        });
      }
    });

    const results = await provider.search({ query: 'svedocs', limit: 5, locale: 'en' });

    expect(requestBody).toMatchObject({
      query: 'svedocs',
      hitsPerPage: 5,
      filters: 'locale:en'
    });
    expect(results[0]).toMatchObject({
      id: 'install',
      title: 'Install',
      section: 'Package manager',
      url: '/docs/install#package-manager'
    });
    expect(results[0]?.excerpt).toContain('svedocs');
  });

  it('queries Typesense as an optional hosted search provider', async () => {
    let requestedUrl: URL | undefined;
    const provider = createTypesenseSearchProvider({
      host: 'https://search.example.test',
      apiKey: 'typesense-key',
      collection: (query) => query.locale ? `docs_${query.locale}` : 'docs',
      queryBy: ['title', 'section', 'content'],
      filterBy: (query) => query.version ? `version:=${query.version}` : undefined,
      async fetch(input, init) {
        requestedUrl = new URL(String(input));
        expect(init?.headers).toMatchObject({
          'x-typesense-api-key': 'typesense-key'
        });
        return Response.json({
          hits: [
            {
              text_match: 42,
              document: {
                id: 'deploy',
                title: 'Deploy',
                content: 'Deploy svedocs to Cloudflare Pages.',
                svedocs: JSON.stringify({
                  url: '/docs/cloudflare',
                  section: 'Cloudflare Pages'
                }),
                locale: 'en',
                version: 'v1',
                kind: 'doc'
              }
            }
          ]
        });
      }
    });

    const results = await provider.search({ query: 'cloudflare', limit: 3, locale: 'en', version: 'v1' });

    expect(requestedUrl?.pathname).toBe('/collections/docs_en/documents/search');
    expect(requestedUrl?.searchParams.get('q')).toBe('cloudflare');
    expect(requestedUrl?.searchParams.get('query_by')).toBe('title,section,content');
    expect(requestedUrl?.searchParams.get('per_page')).toBe('3');
    expect(requestedUrl?.searchParams.get('filter_by')).toBe('version:=v1');
    expect(results[0]).toMatchObject({
      id: 'deploy',
      title: 'Deploy',
      section: 'Cloudflare Pages',
      url: '/docs/cloudflare',
      score: 42
    });
  });

  it('routes configured search providers from runtime env with local fallback', async () => {
    const records = [
      {
        id: 'local-install',
        pageId: 'install',
        url: '/docs/install',
        title: 'Install',
        content: 'Install svedocs with pnpm.',
        metadata: { locale: 'en', version: 'v1', kind: 'doc' }
      }
    ];
    const algoliaConfig = resolveSvedocsConfig({ search: { provider: 'algolia' } });
    let algoliaBody: { filters?: string } | undefined;
    const algoliaResponse = await createConfiguredSearchResponse(
      algoliaConfig,
      records,
      new Request('https://example.test/api/search?q=svedocs&provider=algolia&locale=en&version=v1'),
      {
        env: {
          ALGOLIA_APP_ID: 'APP',
          ALGOLIA_SEARCH_KEY: 'key',
          ALGOLIA_INDEX_NAME: 'docs'
        },
        async fetch(_input, init) {
          algoliaBody = JSON.parse(String(init?.body));
          return Response.json({
            hits: [
              {
                objectID: 'algolia-install',
                title: 'Install',
                url: '/docs/install',
                content: 'Install svedocs with pnpm.',
                locale: 'en',
                version: 'v1',
                kind: 'doc'
              }
            ]
          });
        }
      }
    );
    const algoliaJson = await algoliaResponse.json() as { provider?: string; results: Array<{ id: string }> };
    const typesenseProvider = createConfiguredSearchProvider({
      config: resolveSvedocsConfig({ search: { provider: 'typesense' } }),
      records,
      env: {}
    });

    expect(algoliaBody?.filters).toBe('locale:en AND version:v1');
    expect(algoliaJson.provider).toBe('algolia');
    expect(algoliaJson.results[0]?.id).toBe('algolia-install');
    expect(typesenseProvider.name).toBe('local-json');
  });

  it('routes configured Cloudflare AI Search bindings from named env', async () => {
    const config = resolveSvedocsConfig({
      search: { provider: 'cloudflare-ai-search' },
      cloudflare: { aiSearch: { binding: 'DOCS_SEARCH', instanceName: 'docs' } }
    });
    const provider = createConfiguredSearchProvider({
      config,
      env: {
        DOCS_SEARCH: {
          get(instanceName: string) {
            expect(instanceName).toBe('docs');
            return {
              async search() {
                return {
                  chunks: [
                    {
                      text: 'Deploy to Cloudflare Pages.',
                      item: {
                        metadata: {
                          title: 'Deploy',
                          url: '/docs/cloudflare'
                        }
                      }
                    }
                  ]
                };
              }
            };
          }
        }
      }
    });
    const results = await provider.search({ query: 'deploy' });

    expect(provider.name).toBe('cloudflare-ai-search');
    expect(results[0]).toMatchObject({ title: 'Deploy', url: '/docs/cloudflare' });
  });

  it('creates Cloudflare AI Search documents and dry-run sync results', async () => {
    const page = createFixturePage({
      search: [
        {
          id: 'intro:install',
          pageId: 'intro',
          url: '/docs#install',
          title: 'Intro',
          section: 'Install',
          content: 'Install svedocs with pnpm.',
          metadata: {}
        }
      ]
    });

    const documents = createCloudflareAiSearchDocuments(page.search);
    const result = await syncCloudflareAiSearchIndex({
      records: page.search,
      instanceName: 'fixture',
      dryRun: true,
      strategy: 'replace',
      existingIds: ['intro:install', 'stale'],
      deleteIds: ['manual-delete']
    });

    expect(documents[0]?.content).toContain('Install svedocs');
    expect(JSON.parse(documents[0]?.metadata.svedocs ?? '{}').url).toBe('/docs#install');
    expect(Object.keys(documents[0]?.metadata ?? {})).toEqual(['svedocs']);
    expect(result.dryRun).toBe(true);
    expect(result.indexed).toBe(1);
    expect(result.deleted).toBe(2);
    expect(result.planned.deleteIds).toEqual(['manual-delete', 'stale']);
    expect(result.failed).toBe(0);
  });

  it('batches and retries Cloudflare AI Search sync requests', async () => {
    const page = createFixturePage({
      search: [
        {
          id: 'intro:install',
          pageId: 'intro',
          url: '/docs#install',
          title: 'Intro',
          section: 'Install',
          content: 'Install svedocs with pnpm.',
          metadata: {}
        }
      ]
    });
    let calls = 0;
    const requests: string[] = [];
    const mockFetch: typeof fetch = async (input, init) => {
      calls += 1;
      requests.push(`${init?.method ?? 'GET'} ${String(input)}`);
      if (calls === 1) return new Response('temporary', { status: 503 });
      return new Response('{}', { status: 200 });
    };

    const result = await syncCloudflareAiSearchIndex({
      records: page.search,
      accountId: 'account',
      apiToken: 'token',
      instanceName: 'fixture',
      batchSize: 1,
      maxRetries: 1,
      retryDelayMs: 0,
      deleteIds: ['stale'],
      fetch: mockFetch
    });

    expect(result.dryRun).toBe(false);
    expect(result.deleted).toBe(1);
    expect(result.indexed).toBe(1);
    expect(result.failed).toBe(0);
    expect(requests[0]).toContain('DELETE');
    expect(requests[1]).toContain('DELETE');
    expect(requests[2]).toContain('POST');
  });

  it('creates diff rows with line metadata', () => {
    const rows = createDiffRows('@@ -1,2 +1,2 @@\n-const old = true;\n+const next = true;\n const shared = true;');
    const splitRows = createDiffSplitRows(rows);

    expect(rows.map((row) => row.kind)).toEqual(['meta', 'remove', 'add', 'context']);
    expect(rows[1]).toMatchObject({ oldLine: 1, content: 'const old = true;' });
    expect(rows[2]).toMatchObject({ newLine: 1, content: 'const next = true;' });
    expect(rows[3]).toMatchObject({ oldLine: 2, newLine: 2 });
    expect(splitRows.map((row) => row.kind)).toEqual(['meta', 'change', 'context']);
    expect(splitRows[1]?.old).toMatchObject({ oldLine: 1 });
    expect(splitRows[1]?.new).toMatchObject({ newLine: 1 });
  });

  it('renders split diff blocks with side-by-side cells', async () => {
    const compiled = await compileMarkdown('```diff split title="update.patch"\n@@ -1 +1 @@\n-old\n+new\n```');

    expect(compiled.codeBlocks[0]).toMatchObject({
      diff: true,
      diffMode: 'split',
      addedLines: 1,
      removedLines: 1
    });
    expect(compiled.codeBlocks[0]?.splitRows.map((row) => row.kind)).toEqual(['meta', 'change']);
    expect(compiled.html).toContain('sd-diff-split');
    expect(compiled.html).toContain('data-side="old"');
    expect(compiled.html).toContain('data-side="new"');
  });

  it('renders Ask AI event streams and applies rate limits', async () => {
    const page = createFixturePage({
      search: [
        {
          id: 'intro:install',
          pageId: 'intro',
          url: '/docs#install',
          title: 'Intro',
          section: 'Install',
          content: 'Install svedocs with pnpm.',
          metadata: {}
        }
      ]
    });
    const provider = createMockAiProvider();
    const streamResponse = await createAskResponse(
      provider,
      new Request('https://example.test/api/ask?stream=1', {
        method: 'POST',
        body: JSON.stringify({ question: 'pnpm' })
      }),
      { records: page.search }
    );
    const limiter = createMemoryRateLimiter({ windowMs: 60_000, max: 1 });
    await createAskResponse(
      provider,
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'pnpm' })
      }),
      { records: page.search, rateLimiter: limiter }
    );
    const limited = await createAskResponse(
      provider,
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'pnpm' })
      }),
      { records: page.search, rateLimiter: limiter }
    );

    expect(streamResponse.headers.get('content-type')).toContain('text/event-stream');
    expect(await streamResponse.text()).toContain('event: citations');
    expect(limited.status).toBe(429);
  });

  it('scopes Ask AI local citations from request metadata', async () => {
    const provider = createMockAiProvider();
    const response = await createAskResponse(
      provider,
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          question: 'deploy',
          locale: 'zh'
        })
      }),
      {
        records: [
          {
            id: 'en-deploy',
            pageId: 'deploy',
            url: '/docs/deploy',
            title: 'Deploy',
            content: 'Deploy to Cloudflare.',
            metadata: { locale: 'en', version: 'v1' }
          },
          {
            id: 'zh-deploy',
            pageId: 'zh-deploy',
            url: '/docs/zh/deploy',
            title: '部署',
            content: 'Deploy svedocs to Cloudflare Pages.',
            metadata: { locale: 'zh', version: 'v1' }
          }
        ]
      }
    );
    const json = await response.json() as { citations: Array<{ url: string }> };

    expect(json.citations.map((citation) => citation.url)).toEqual(['/docs/zh/deploy']);
  });

  it('uses Cloudflare AI Search chat completions for Ask AI', async () => {
    const provider = createCloudflareAiSearchAiProvider({
      binding: {
        async search() {
          return {
            response: 'Search fallback answer.'
          };
        },
        async chatCompletions(input) {
          return {
            choices: [
              {
                message: {
                  content: `Answering: ${input.messages.at(-1)?.content}`
                }
              }
            ],
            chunks: [
              {
                text: 'Install svedocs with pnpm.',
                item: {
                  metadata: {
                    title: 'Install',
                    url: '/docs/install'
                  }
                }
              }
            ]
          };
        }
      }
    });

    const result = await provider.ask({ question: 'How do I install?' });

    expect(result.answer).toContain('How do I install?');
    expect(result.citations[0]).toMatchObject({
      title: 'Install',
      url: '/docs/install'
    });
  });

  it('supports Workers AI providers and KV-backed rate limits', async () => {
    const page = createFixturePage({
      search: [
        {
          id: 'intro:install',
          pageId: 'intro',
          url: '/docs#install',
          title: 'Intro',
          section: 'Install',
          content: 'Install svedocs with pnpm.',
          metadata: {}
        }
      ]
    });
    const provider = createWorkersAiProvider({
      ai: {
        async run() {
          return { response: 'Use pnpm and follow the install guide.' };
        }
      }
    });
    const store = new Map<string, string>();
    const limiter = createCloudflareKvRateLimiter({
      namespace: {
        async get(key) {
          const value = store.get(key);
          return value ? JSON.parse(value) : null;
        },
        async put(key, value) {
          store.set(key, value);
        }
      },
      windowMs: 60_000,
      max: 1
    });

    const first = await createAskResponse(
      provider,
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'pnpm' })
      }),
      { records: page.search, rateLimiter: limiter, rateLimitKey: 'kv-test' }
    );
    const second = await createAskResponse(
      provider,
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'pnpm' })
      }),
      { records: page.search, rateLimiter: limiter, rateLimitKey: 'kv-test' }
    );
    const result = await first.json() as { answer: string; citations: Array<{ url: string }> };

    expect(result.answer).toContain('pnpm');
    expect(result.citations[0]?.url).toBe('/docs#install');
    expect(second.status).toBe(429);
  });

  it('uses OpenAI-compatible Ask AI providers with local RAG context', async () => {
    let requestBody: {
      model?: string;
      messages?: Array<{ role: string; content: string }>;
    } | undefined;
    const provider = createOpenAiCompatibleProvider({
      apiKey: 'test-key',
      model: 'provider/model',
      baseUrl: 'https://llm.example.test/v1',
      async fetch(input, init) {
        expect(String(input)).toBe('https://llm.example.test/v1/chat/completions');
        expect(init?.headers).toMatchObject({
          authorization: 'Bearer test-key'
        });
        requestBody = JSON.parse(String(init?.body));
        return Response.json({
          choices: [
            {
              message: {
                content: 'Deploy with Cloudflare Pages.'
              }
            }
          ]
        });
      }
    });
    const result = await provider.ask({
      question: 'How do I deploy?',
      records: [
        {
          id: 'deploy',
          pageId: 'deploy',
          url: '/docs/cloudflare',
          title: 'Cloudflare',
          section: 'Deploy',
          content: 'Deploy svedocs with Cloudflare Pages.',
          metadata: { locale: 'en' }
        }
      ],
      scope: { locale: 'en' }
    });

    expect(requestBody?.model).toBe('provider/model');
    expect(requestBody?.messages?.at(-1)?.content).toContain('/docs/cloudflare');
    expect(result.answer).toBe('Deploy with Cloudflare Pages.');
    expect(result.citations[0]).toMatchObject({
      title: 'Cloudflare',
      section: 'Deploy',
      url: '/docs/cloudflare'
    });
  });

  it('routes configured Ask AI providers from runtime env', async () => {
    const config = resolveSvedocsConfig({ ai: { provider: 'openai-compatible' } });
    let requestBody: { model?: string } | undefined;
    const response = await createConfiguredAskResponse(
      config,
      [
        {
          id: 'deploy',
          pageId: 'deploy',
          url: '/docs/cloudflare',
          title: 'Cloudflare',
          content: 'Deploy svedocs to Cloudflare Pages.',
          metadata: { locale: 'en' }
        }
      ],
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'deploy', locale: 'en' })
      }),
      {
        env: {
          OPENAI_COMPATIBLE_API_KEY: 'key',
          OPENAI_COMPATIBLE_BASE_URL: 'https://llm.example.test/v1',
          OPENAI_COMPATIBLE_MODEL: 'provider/model'
        },
        async fetch(_input, init) {
          requestBody = JSON.parse(String(init?.body));
          return Response.json({ choices: [{ message: { content: 'Use the edge preset.' } }] });
        }
      }
    );
    const json = await response.json() as { answer: string; citations: Array<{ url: string }> };
    const workersProvider = createConfiguredAiProvider({
      config: resolveSvedocsConfig({ ai: { provider: 'cloudflare-workers-ai' } }),
      env: {
        AI: {
          async run() {
            return { response: 'Workers AI answer.' };
          }
        }
      }
    });

    expect(requestBody?.model).toBe('provider/model');
    expect(json.answer).toBe('Use the edge preset.');
    expect(json.citations[0]?.url).toBe('/docs/cloudflare');
    expect(workersProvider.name).toBe('cloudflare-workers-ai');
  });

  it('falls back to mock Ask AI when configured provider env is missing', async () => {
    const provider = createConfiguredAiProvider({
      config: resolveSvedocsConfig({ ai: { provider: 'openai-compatible' } }),
      env: {}
    });

    expect(provider.name).toBe('mock');
  });

  it.skipIf(process.env.SVEDOCS_CLOUDFLARE_AI_SEARCH_INTEGRATION !== '1')('runs a real Cloudflare AI Search indexing smoke test', async () => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const namespace = process.env.SVEDOCS_CLOUDFLARE_AI_SEARCH_NAMESPACE;
    const result = await syncCloudflareAiSearchIndex({
      records: [
        {
          id: `svedocs-integration-${Date.now()}`,
          pageId: 'integration',
          url: '/integration',
          title: 'Integration',
          content: 'Cloudflare AI Search integration smoke test document.',
          metadata: {}
        }
      ],
      ...(accountId ? { accountId } : {}),
      ...(apiToken ? { apiToken } : {}),
      instanceName: process.env.SVEDOCS_CLOUDFLARE_AI_SEARCH_INSTANCE ?? 'svedocs',
      ...(namespace ? { namespace } : {}),
      waitForCompletion: true,
      maxRetries: 1
    });

    expect(result.failed).toBe(0);
    expect(result.indexed).toBe(1);
  }, 60_000);
});
