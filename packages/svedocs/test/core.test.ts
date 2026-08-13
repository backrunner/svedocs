import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createAskResponse, createCloudflareAiSearchAiProvider, createCloudflareKvRateLimiter, createConfiguredAiProvider, createConfiguredAskResponse, createMemoryRateLimiter, createMockAiProvider, createOpenAiCompatibleProvider, createWorkersAiProvider } from '../src/ai';
import { createCloudflareEnvDts, createWranglerJson, readSvedocsBuildMode, svedocsPagePrerender, svedocsSsr, svedocsTrailingSlash } from '../src/cloudflare';
import { defineConfig, loadSvedocsConfigFile, validateSvedocsConfig } from '../src/config';
import { checkPackagePublication, createPageTree, createSearchRecords, createSvedocsRouteEntries, flattenPageTree, loadSvedocsContent, resolveSvedocsConfig, resolveSvedocsHref, resolveSvedocsPageRoute } from '../src/core';
import { createConfiguredOgImageFormat, createConfiguredOgImageTemplate, createConfiguredPageOgImageEntries, createJsonLdScript, createOgPng, createPageAlternates, createPageMetadata, createPageOgImagePath, createPageOgImageResponse, createRobotsResponse, createRobotsTxt, createRssResponse, createRssXml, createSatoriOgSvg, createSitemapResponse, createSitemapXml, serializeJsonLd } from '../src/og';
import { compileMarkdown, createDiffRows, createDiffSplitRows } from '../src/mdx/compile';
import { extractMarkdownOutline, extractMarkdownSections } from '../src/mdx/ast';
import { createAlgoliaSearchProvider, createCloudflareAiSearchDocuments, createCloudflareAiSearchProvider, createConfiguredSearchProvider, createConfiguredSearchResponse, createSearchResponse, createTypesenseSearchProvider, searchRecords, syncCloudflareAiSearchIndex } from '../src/search';
import { createFixturePage } from '../src/testing';
import { createAskAiController, createPageToolsController, createSearchController, createThemeContext, createThemeInitScript, createThemeModeController, createThemeStyle, resolveLocaleCodeFromPath, resolveLocalizedHref, resolveLocalizedNavItem } from '../src/theme/headless';
import { svedocs } from '../src/vite';

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
    expect(config.theme.code.copyButton).toBe(true);
    expect(config.theme.brand).toMatchObject({ label: 'svedocs', href: '/', mark: 'pixel' });
    expect(config.theme.nav.map((item) => item.href)).toEqual(['/docs']);
    expect(config.theme.home.kicker).toBe('SvelteKit-native docs');
    expect(config.theme.footer && config.theme.footer.text).toContain('MIT licensed');
    expect(config.seo.ogImage && config.seo.ogImage.outDir).toBe('static/og');
    expect(config.seo.ogImage && config.seo.ogImage.format).toBe('svg');
    expect(config.seo.sitemap).toBe(true);
    expect(config.seo.rss).toBe(false);
    expect(config.search.scope).toBe('current');
    expect(config.ai.enabled).toBe(false);
    expect(config.ai.scope).toBe('current');
    expect(config.i18n.locales).toEqual([]);
    expect(config.i18n.messages.en!['search.placeholder']).toBe('Search docs');
    expect(config.i18n.messages.en!['home.primaryAction']).toBe('Read docs');
    expect(config.checks.translations).toBe(false);
  });

  it('uses one fixed theme without bootstrap or switching behavior', () => {
    const light = resolveSvedocsConfig({ theme: { defaultMode: 'light' } });
    const dark = resolveSvedocsConfig({ theme: { defaultMode: 'dark' } });

    expect(createThemeInitScript('light')).toBe('');
    expect(createThemeInitScript('dark')).toBe('');
    expect(createThemeStyle(light)).toContain('--sd-bg:#f8f7f2');
    expect(createThemeStyle(light)).not.toContain('--sd-bg:#11130f');
    expect(createThemeStyle(dark)).toContain('--sd-bg:#11130f');
    expect(createThemeStyle(dark)).not.toContain('--sd-bg:#f8f7f2');

    const controller = createThemeModeController('dark');
    controller.toggle();
    controller.apply('light');
    controller.setPreference('system');
    expect(get(controller.mode)).toBe('dark');
    expect(get(controller.preference)).toBe('dark');
  });

  it('compiles fixed-mode code blocks with one Shiki theme', async () => {
    const compiled = await compileMarkdown('```ts\nconst value = 1;\n```', { codeTheme: 'github-dark' });

    expect(compiled.html).not.toContain('shiki-themes github-light github-dark');
    expect(compiled.html).not.toContain('--shiki-light:');
    expect(compiled.html).toContain('class="shiki github-dark sd-code"');
    expect(compiled.html).toMatch(/<pre[^>]+style="[^"]*color:#e1e4e8 !important[^"]*"/);
    expect(compiled.html).toContain('style="color:#F97583 !important"');
  });

  it('resolves localized shell messages with defaults, overrides, fallback, and interpolation', () => {
    const singleLocale = resolveSvedocsConfig({ i18n: false });
    expect(singleLocale.i18n.messages.en!['ask.label']).toBe('Ask AI');

    const config = resolveSvedocsConfig({
      theme: {
        nav: [
          { label: 'Docs', href: '/docs' },
          { label: 'Configuration', href: '/docs/configuration' }
        ],
        footer: {
          text: 'Built by {site}'
        }
      },
      ai: {
        label: 'Ask docs',
        placeholder: 'Ask the docs',
        welcomeMessage: 'Welcome to {site}',
        suggestions: ['Install', 'Deploy']
      },
      i18n: {
        defaultLocale: 'en',
        locales: [
          { code: 'en', label: 'English' },
          { code: 'zh', label: '中文', hreflang: 'zh-CN', dir: 'ltr' }
        ],
        messages: {
          en: {
            'search.placeholder': 'Search everything'
          },
          zh: {
            'search.placeholder': '搜索文档',
            'article.updated': '更新于 {date}',
            'ask.label': '问 AI'
          }
        }
      }
    });
    const context = createThemeContext({
      config,
      page: createFixturePage({ routePath: '/docs/zh', locale: 'zh', kind: 'doc' })
    });

    expect(config.i18n.messages.en!['search.placeholder']).toBe('Search everything');
    expect(config.i18n.messages.en!['ask.label']).toBe('Ask docs');
    expect(context.locale?.hreflang).toBe('zh-CN');
    expect(context.localeCode).toBe('zh');
    expect(context.languageTag).toBe('zh-CN');
    expect(context.t('search.placeholder')).toBe('搜索文档');
    expect(context.t('search.trigger')).toBe('Search');
    expect(context.t('article.updated', { date: '2026-05-18' })).toBe('更新于 2026-05-18');
    expect(context.t('footer.text', { site: 'Fixture' })).toBe('Built by Fixture');
    expect(createThemeInitScript('system', context.languageTag, context.locale?.dir)).toContain('var l="zh-CN"');

    const localizedNavContext = createThemeContext({
      config,
      page: createFixturePage({
        routePath: '/docs/zh/configuration/theme',
        scopePath: '/docs/configuration/theme',
        locale: 'zh',
        kind: 'doc'
      }),
      pages: [
        createFixturePage({
          routePath: '/docs/configuration',
          scopePath: '/docs/configuration',
          locale: 'en',
          kind: 'doc'
        }),
        createFixturePage({
          routePath: '/docs/zh/configuration',
          scopePath: '/docs/configuration',
          locale: 'zh',
          kind: 'doc'
        })
      ]
    });
    expect(localizedNavContext.activeNavHref).toBe('/docs/zh/configuration');
  });

  it('localizes project-defined labels and internal links without path-specific rules', () => {
    const config = resolveSvedocsConfig({
      theme: {
        nav: [
          { label: 'Guides', labelKey: 'nav.guides', href: '/docs/guides' }
        ]
      },
      i18n: {
        defaultLocale: 'en',
        locales: [
          { code: 'en', label: 'English' },
          { code: 'zh', label: '中文', hreflang: 'zh-CN' }
        ],
        messages: {
          zh: {
            'nav.guides': '指南'
          }
        }
      }
    });
    const pages = [
      createFixturePage({ routePath: '/', scopePath: '/', locale: 'en', kind: 'page' }),
      createFixturePage({ routePath: '/zh', scopePath: '/', locale: 'zh', kind: 'page' }),
      createFixturePage({ routePath: '/docs/guides', scopePath: '/docs/guides', locale: 'en', kind: 'doc' }),
      createFixturePage({ routePath: '/docs/zh/guides', scopePath: '/docs/guides', locale: 'zh', kind: 'doc' })
    ];
    const context = createThemeContext({
      config,
      page: pages[3]!,
      pages
    });

    expect(resolveLocalizedNavItem(config.theme.nav[0]!, context)).toMatchObject({
      label: '指南',
      href: '/docs/zh/guides'
    });
    const englishContext = createThemeContext({
      config,
      page: pages[2]!,
      pages
    });
    expect(resolveLocalizedNavItem(config.theme.nav[0]!, englishContext)).toMatchObject({
      label: 'Guides',
      href: '/docs/guides'
    });
    expect(createThemeContext({
      config,
      page: createFixturePage({
        routePath: '/zh',
        scopePath: '/',
        locale: 'zh',
        kind: 'page',
        frontmatter: {}
      })
    }).surface).toBe('home');
    expect(resolveLocalizedHref('/', context)).toBe('/zh');
    expect(resolveLocaleCodeFromPath('/docs/zh/missing', config)).toBe('zh');
    expect(resolveLocaleCodeFromPath('/missing', config)).toBe('en');
  });

  it('resolves localized routes and redirects missing translations to the default locale', () => {
    const config = resolveSvedocsConfig({
      i18n: {
        defaultLocale: 'en',
        locales: ['en', 'zh']
      }
    });
    const pages = [
      createFixturePage({ id: 'guide-en', routePath: '/docs/guide', scopePath: '/docs/guide', locale: 'en', kind: 'doc' }),
      createFixturePage({ id: 'guide-zh', routePath: '/docs/zh/guide', scopePath: '/docs/guide', locale: 'zh', kind: 'doc' }),
      createFixturePage({ id: 'install-en', routePath: '/docs/install', scopePath: '/docs/install', locale: 'en', kind: 'doc' }),
      createFixturePage({ id: 'home-en', routePath: '/', scopePath: '/', locale: 'en', kind: 'page' })
    ];

    expect(resolveSvedocsPageRoute('/docs/zh/guide', pages, config)).toMatchObject({
      status: 'found',
      page: { id: 'guide-zh' }
    });
    expect(resolveSvedocsPageRoute('/docs/zh/install', pages, config)).toMatchObject({
      status: 'redirect',
      location: '/docs/install',
      requestedLocale: 'zh',
      resolvedLocale: 'en'
    });
    expect(resolveSvedocsPageRoute('/zh', pages, config)).toMatchObject({
      status: 'redirect',
      location: '/'
    });
    expect(resolveSvedocsPageRoute('/docs/zh/missing', pages, config)).toEqual({
      status: 'missing',
      requestedLocale: 'zh'
    });
    expect(resolveSvedocsPageRoute('/docs/not-a-locale/install', pages, config)).toEqual({ status: 'missing' });
    expect(createSvedocsRouteEntries(pages, config)).toEqual([
      '/docs/guide',
      '/docs/zh/guide',
      '/docs/install',
      '/docs/zh/install',
      '/zh'
    ]);

    const prefixedConfig = resolveSvedocsConfig({
      i18n: {
        defaultLocale: 'en-US',
        prefixDefaultLocale: true,
        locales: [
          { code: 'en-US', path: 'en' },
          { code: 'zh-Hans', path: 'zh' }
        ]
      }
    });
    const prefixedPages = [
      createFixturePage({ id: 'install-en', routePath: '/docs/en/install', scopePath: '/docs/install', locale: 'en-US', kind: 'doc' }),
      createFixturePage({ id: 'install-zh', routePath: '/docs/zh/install', scopePath: '/docs/install', locale: 'zh-Hans', kind: 'doc' }),
      createFixturePage({ id: 'missing-en', routePath: '/docs/en/missing', scopePath: '/docs/missing', locale: 'en-US', kind: 'doc' })
    ];
    expect(resolveSvedocsPageRoute('/docs/zh/install', prefixedPages, prefixedConfig)).toMatchObject({
      status: 'found',
      page: { id: 'install-zh' }
    });
    expect(resolveSvedocsPageRoute('/docs/zh/missing', prefixedPages, prefixedConfig)).toMatchObject({
      status: 'redirect',
      location: '/docs/en/missing',
      requestedLocale: 'zh-Hans',
      resolvedLocale: 'en-US'
    });
  });

  it('localizes authored links, preserves suffixes, and respects explicit locale routes', () => {
    const config = resolveSvedocsConfig({
      i18n: {
        defaultLocale: 'en',
        locales: ['en', 'zh']
      }
    });
    const current = createFixturePage({
      id: 'guide-zh',
      sourcePath: 'content/docs/zh/guides/intro.md',
      routePath: '/docs/zh/guides/intro',
      scopePath: '/docs/guides/intro',
      locale: 'zh',
      kind: 'doc'
    });
    const pages = [
      current,
      createFixturePage({ id: 'install-en', routePath: '/docs/install', scopePath: '/docs/install', locale: 'en', kind: 'doc' }),
      createFixturePage({ id: 'api-en', routePath: '/docs/api', scopePath: '/docs/api', locale: 'en', kind: 'doc' }),
      createFixturePage({ id: 'api-zh', routePath: '/docs/zh/api', scopePath: '/docs/api', locale: 'zh', kind: 'doc' }),
      createFixturePage({ id: 'about-en', routePath: '/about', scopePath: '/about', locale: 'en', kind: 'page' }),
      createFixturePage({ id: 'about-zh', routePath: '/zh/about', scopePath: '/about', locale: 'zh', kind: 'page' })
    ];

    expect(resolveSvedocsHref({ href: '../api.md?tab=one#client', pages, config, page: current })).toMatchObject({
      href: '/docs/zh/api?tab=one#client',
      page: { id: 'api-zh' },
      fallback: false
    });
    expect(resolveSvedocsHref({ href: '/docs/install#requirements', pages, config, page: current })).toMatchObject({
      href: '/docs/install#requirements',
      page: { id: 'install-en' },
      fallback: true
    });
    expect(resolveSvedocsHref({ href: '/docs/zh/api', pages, config, page: pages[1]! })).toMatchObject({
      href: '/docs/zh/api',
      page: { id: 'api-zh' },
      fallback: false
    });
    expect(resolveSvedocsHref({ href: '/about', pages, config, page: current })).toMatchObject({
      href: '/zh/about',
      page: { id: 'about-zh', kind: 'page' },
      fallback: false
    });
    expect(resolveSvedocsHref({ href: '#local', pages, config, page: current })).toEqual({ href: '#local', fallback: false });
    expect(resolveSvedocsHref({ href: '/images/guide.png', pages, config, page: current })).toEqual({ href: '/images/guide.png', fallback: false });
  });

  it('rejects ambiguous locale configuration before content discovery', () => {
    expect(() => resolveSvedocsConfig({
      i18n: {
        defaultLocale: 'fr',
        locales: ['en', 'zh']
      }
    })).toThrow('must match a configured locale code');
    expect(() => resolveSvedocsConfig({
      i18n: {
        defaultLocale: 'en'
      }
    })).toThrow('requires at least one configured locale');
    expect(() => resolveSvedocsConfig({
      i18n: {
        locales: [
          { code: 'en', path: 'docs' },
          { code: 'zh', path: 'zh' }
        ]
      }
    })).toThrow('reserved /docs route');
    expect(() => resolveSvedocsConfig({
      i18n: {
        locales: [
          { code: 'en', path: 'en' },
          { code: 'zh', path: 'EN' }
        ]
      }
    })).toThrow('locale path "EN" is shared');
    expect(() => resolveSvedocsConfig({
      i18n: {
        locales: [
          { code: 'en', path: 'en%2Fdocs' }
        ]
      }
    })).toThrow('one non-empty URL-safe segment');
    expect(() => resolveSvedocsConfig({
      i18n: {
        locales: [
          { code: 'en', hreflang: 'en' },
          { code: 'english', hreflang: 'en' }
        ]
      }
    })).toThrow('language tag "en" is shared');
    expect(() => resolveSvedocsConfig({
      i18n: {
        locales: [
          { code: 'en-abcdefghi' }
        ]
      }
    })).toThrow('must be a valid BCP 47 language tag');
    expect(resolveSvedocsConfig({
      i18n: {
        locales: [
          { code: 'en-abcdefghi', hreflang: 'en' }
        ]
      }
    }).i18n.locales[0]).toMatchObject({
      code: 'en-abcdefghi',
      hreflang: 'en'
    });
    expect(() => validateSvedocsConfig({
      i18n: {
        locales: ['en'],
        messages: {
          zh: { 'search.placeholder': '搜索' }
        }
      }
    })).toThrow('unknown locale "zh"');
  });

  it('throws when an existing config imports a missing dependency', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-config-import-'));
    try {
      const configFile = path.join(tmp, 'svedocs.config.mjs');
      await writeFile(configFile, 'import "missing-svedocs-config-package";\nexport default {};\n', 'utf8');

      await expect(loadSvedocsConfigFile(configFile)).rejects.toThrow('missing-svedocs-config-package');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('aligns SvelteKit route options across build modes', () => {
    expect(readSvedocsBuildMode('edge')).toBe('edge');
    expect(readSvedocsBuildMode('static')).toBe('static');
    expect(readSvedocsBuildMode('spa')).toBe('spa');
    expect(readSvedocsBuildMode('unknown')).toBe('edge');
    expect(svedocsSsr('edge')).toBe(true);
    expect(svedocsSsr('static')).toBe(true);
    expect(svedocsSsr('spa')).toBe(true);
    expect(svedocsPagePrerender('edge')).toBe('auto');
    expect(svedocsPagePrerender('static')).toBe(true);
    expect(svedocsPagePrerender('spa')).toBe(true);
    expect(svedocsPagePrerender('edge', resolveSvedocsConfig())).toBe(false);
    expect(svedocsPagePrerender('edge', resolveSvedocsConfig({ agent: false }))).toBe('auto');
    expect(svedocsPagePrerender('edge', resolveSvedocsConfig({ agent: { negotiation: false } }))).toBe('auto');
    expect(svedocsPagePrerender('static', resolveSvedocsConfig())).toBe(true);
    expect(svedocsTrailingSlash('edge')).toBe('never');
    expect(svedocsTrailingSlash('static')).toBe('always');
    expect(svedocsTrailingSlash('spa')).toBe('always');
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
        code: {
          copyButton: false
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
        head: {
          meta: [
            { name: 'google-site-verification', content: 'verify-me' }
          ],
          links: [
            { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml', title: 'Feed' }
          ],
          jsonLd: [
            { '@type': 'Organization', name: 'svedocs' }
          ]
        },
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
    expect(config.theme.code.copyButton).toBe(false);
    expect(config.theme.brand).toMatchObject({ label: 'Docs Lab', href: '/home', mark: false });
    expect(config.theme.nav[1]).toMatchObject({ external: true });
    expect(config.theme.social[0]).toMatchObject({ label: 'Discord' });
    expect(config.theme.footer && config.theme.footer.text).toBe('Custom footer');
    expect(config.theme.home.visual).toMatchObject({ type: 'image', src: '/hero.png', alt: 'Hero preview' });
    expect(config.search.scope).toBe('all');
    expect(config.ai.scope).toBe('all');
    expect(config.seo.defaultAuthor).toBe('svedocs team');
    expect(config.seo.head.meta[0]).toEqual({ name: 'google-site-verification', content: 'verify-me' });
    expect(config.seo.head.links[0]).toEqual({ rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml', title: 'Feed' });
    expect(config.seo.head.jsonLd[0]).toEqual({ '@type': 'Organization', name: 'svedocs' });
    expect(config.seo.ogImage && config.seo.ogImage.format).toBe('png');
    expect(config.seo.ogImage && config.seo.ogImage.outDir).toBe('static/custom-og');
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

  it('creates theme context and local search controller state for custom themes', () => {
    const config = resolveSvedocsConfig({
      search: { scope: 'current' },
      ai: { scope: 'current' },
      theme: {
        nav: [
          { label: 'Docs', href: '/docs' },
          { label: 'API', href: '/docs/reference' }
        ]
      }
    });
    const page = createFixturePage({
      routePath: '/docs/reference/api',
      locale: 'en',
      kind: 'doc'
    });
    const record = {
      id: 'api',
      pageId: page.id,
      url: page.routePath,
      title: 'API Reference',
      content: 'Theme components and headless controllers',
      metadata: { locale: 'en', kind: 'doc' }
    };

    const context = createThemeContext({
      config,
      page,
      pages: [page],
      search: [record]
    });
    const controller = createSearchController({
      records: [record],
      scope: context.searchScope,
      provider: 'local',
      buildMode: 'edge'
    });

    controller.show();
    controller.setQuery('headless');

    expect(context.activeNavHref).toBe('/docs/reference');
    expect(context.searchScope).toEqual({ locale: 'en' });
    expect(controller.select()?.url).toBe('/docs/reference/api');
  });

  it('updates headless search records when custom themes replace records with an empty set', () => {
    const page = createFixturePage({ routePath: '/docs/search', locale: 'en', kind: 'doc' });
    const records = [{
      id: 'search-theme',
      pageId: page.id,
      url: page.routePath,
      title: 'Search Theme',
      content: 'Custom search component records',
      metadata: { locale: 'en', kind: 'doc' }
    }];
    const controller = createSearchController({ records, provider: 'local', buildMode: 'edge' });

    controller.setQuery('custom');
    expect(get(controller.results).map((result) => result.id)).toEqual(['search-theme']);

    controller.setOptions({ records: [] });

    expect(get(controller.results)).toEqual([]);
    expect(get(controller.recordsStatus)).toBe('idle');
  });

  it('updates headless Ask AI records when custom themes replace records with an empty set', async () => {
    const page = createFixturePage({ routePath: '/docs/ask-ai', locale: 'en', kind: 'doc' });
    const config = resolveSvedocsConfig({
      ai: {
        enabled: true,
        provider: 'mock'
      }
    });
    const records = [{
      id: 'ask-theme',
      pageId: page.id,
      url: page.routePath,
      title: 'Ask AI Theme',
      content: 'Custom Ask AI component records',
      metadata: { locale: 'en', kind: 'doc' }
    }];
    const controller = createAskAiController({ config, records, buildMode: 'static' });

    expect(await controller.ensureRecords()).toEqual(records);

    controller.setOptions({ records: [] });
    await controller.send('Custom Ask AI component records');

    expect(await controller.ensureRecords()).toEqual([]);
    expect(get(controller.messages).at(-1)?.content).toBe('I could not find a matching local source for that question.');
  });

  it('localizes headless search and Ask AI fallback messages', async () => {
    const config = resolveSvedocsConfig({
      ai: {
        enabled: true,
        provider: 'mock'
      },
      i18n: {
        defaultLocale: 'en',
        locales: [
          { code: 'en', label: 'English' },
          { code: 'zh', label: '中文' }
        ],
        messages: {
          zh: {
            'search.requestError': '搜索请求返回 {status}。',
            'ask.localEmpty': '没有找到本地来源。',
            'ask.localSources': '找到 {count} 个本地来源。'
          }
        }
      }
    });
    const context = createThemeContext({
      config,
      page: createFixturePage({ routePath: '/docs/zh/search', locale: 'zh', kind: 'doc' })
    });
    const searchController = createSearchController({
      provider: 'algolia',
      buildMode: 'edge',
      t: context.t,
      async fetcher() {
        return new Response('unavailable', { status: 503 });
      }
    });
    searchController.show();
    searchController.setQuery('anything');
    await new Promise((resolve) => setTimeout(resolve, 175));

    expect(get(searchController.remoteError)).toBe('搜索请求返回 503。');

    const askController = createAskAiController({
      config,
      buildMode: 'static',
      t: context.t
    });
    await askController.send('anything');

    expect(get(askController.messages).at(-1)?.content).toBe('没有找到本地来源。');

    const emptyWelcomeConfig = resolveSvedocsConfig({
      ai: {
        enabled: true,
        provider: 'mock',
        welcomeMessage: 'Global welcome'
      },
      i18n: {
        defaultLocale: 'en',
        locales: [
          { code: 'en', label: 'English' },
          { code: 'zh', label: '中文' }
        ],
        messages: {
          zh: {
            'ask.welcome': ''
          }
        }
      }
    });
    const emptyWelcomeContext = createThemeContext({
      config: emptyWelcomeConfig,
      page: createFixturePage({ routePath: '/docs/zh/ask', locale: 'zh', kind: 'doc' })
    });
    const emptyWelcomeController = createAskAiController({
      config: emptyWelcomeConfig,
      buildMode: 'static',
      welcomeMessage: emptyWelcomeContext.t('ask.welcome'),
      t: emptyWelcomeContext.t
    });
    emptyWelcomeController.show();
    expect(get(emptyWelcomeController.messages)).toEqual([]);
  });

  it('debounces remote search and rejects unsafe result URLs', async () => {
    let calls = 0;
    const controller = createSearchController({
      provider: 'algolia',
      buildMode: 'edge',
      async fetcher() {
        calls += 1;
        return Response.json({
          results: [
            {
              id: 'unsafe',
              title: 'Unsafe',
              url: 'javascript:alert(1)',
              excerpt: 'Unsafe URL',
              score: 1,
              metadata: {}
            },
            {
              id: 'backslash',
              title: 'Backslash',
              url: '/\\evil.example/path',
              excerpt: 'Protocol-relative URL',
              score: 0.5,
              metadata: {}
            }
          ]
        });
      }
    });
    controller.show();
    controller.setQuery('a');
    controller.setQuery('ab');
    controller.setQuery('abc');
    await new Promise((resolve) => setTimeout(resolve, 175));

    expect(calls).toBe(1);
    expect(get(controller.results).map((result) => result.url)).toEqual(['#', '#']);
  });

  it('cancels an in-flight Ask AI request when the conversation resets', async () => {
    const config = resolveSvedocsConfig({ ai: { enabled: true, provider: 'mock' } });
    let aborted = false;
    const controller = createAskAiController({
      config,
      buildMode: 'edge',
      async fetcher(_input, init) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
        });
      }
    });
    const pending = controller.send('install');
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.reset();
    await pending;

    expect(aborted).toBe(true);
    expect(get(controller.loading)).toBe(false);
    expect(get(controller.messages).filter((message) => !message.welcome)).toEqual([]);
  });

  it('reads CRLF Ask AI event streams in the headless controller', async () => {
    const config = resolveSvedocsConfig({
      ai: {
        enabled: true,
        provider: 'mock'
      }
    });
    const encoder = new TextEncoder();
    const controller = createAskAiController({
      config,
      buildMode: 'edge',
      async fetcher() {
        return new Response(new ReadableStream({
          start(streamController) {
            for (const chunk of [
              'event: answer\r',
              '\ndata: {"answer":"Use pnpm."}\r\n\r',
              '\nevent: citations\r\n',
              'data: {"citations":[{"title":"Install","url":"/docs/install"}]}\r\n\r\n',
              'event: done\r\ndata: {}\r\n\r\n'
            ]) {
              streamController.enqueue(encoder.encode(chunk));
            }
            streamController.close();
          }
        }), {
          headers: {
            'content-type': 'text/event-stream'
          }
        });
      }
    });

    await controller.send('install');

    const assistant = get(controller.messages).find((message) => message.role === 'assistant');
    expect(assistant?.content).toBe('Use pnpm.');
    expect(assistant?.citations?.[0]?.url).toBe('/docs/install');
  });

  it('fills error-only Ask AI streams with a fallback message', async () => {
    const config = resolveSvedocsConfig({
      ai: {
        enabled: true,
        provider: 'cloudflare-ai-search'
      }
    });
    const rpcError = 'The RPC receiver does not implement the method "get".';
    const controller = createAskAiController({
      config,
      buildMode: 'edge',
      async fetcher() {
        return new Response([
          `event: error\ndata: ${JSON.stringify({ error: rpcError })}`,
          'event: done\ndata: {}'
        ].join('\n\n'), {
          status: 500,
          headers: {
            'content-type': 'text/event-stream'
          }
        });
      }
    });

    await controller.send('install');

    const assistant = get(controller.messages).at(-1);
    expect(assistant?.role).toBe('assistant');
    expect(assistant?.content).not.toBe('');
    expect(assistant?.error).toBe(rpcError);
  });

  it('fills successful Ask AI streams without answer content with a fallback message', async () => {
    const config = resolveSvedocsConfig({
      ai: {
        enabled: true,
        provider: 'cloudflare-ai-search'
      }
    });
    const controller = createAskAiController({
      config,
      buildMode: 'edge',
      async fetcher() {
        return new Response('event: chunks\ndata: []\n\nevent: done\ndata: {}\n\n', {
          headers: {
            'content-type': 'text/event-stream'
          }
        });
      }
    });

    await controller.send('install');

    const assistant = get(controller.messages).at(-1);
    expect(assistant?.role).toBe('assistant');
    expect(assistant?.content).not.toBe('');
    expect(assistant?.error).toBe('Ask AI failed.');
  });

  it('keeps Ask AI page tools hidden and inert when AI is disabled', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let dispatched = 0;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        dispatchEvent() {
          dispatched += 1;
          return true;
        }
      }
    });
    try {
      const controller = createPageToolsController(resolveSvedocsConfig());

      expect(get(controller.visible)).toBe(false);
      expect(get(controller.mode)).toBe('solo');
      controller.openAskAi();
      expect(dispatched).toBe(0);
    } finally {
      restoreGlobalProperty('window', originalWindow);
    }
  });

  it('tracks theme mode system preference without persisting the resolved mode', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const storage = new Map<string, string>();
    const root = { dataset: {} as Record<string, string>, style: {} as { colorScheme?: string } };
    let prefersDark = true;
    let mediaListener: ((event: MediaQueryListEvent) => void) | undefined;
    const media = {
      get matches() {
        return prefersDark;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
        mediaListener = listener as (event: MediaQueryListEvent) => void;
      },
      removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
        if (mediaListener === listener) mediaListener = undefined;
      },
      addListener() {
        return undefined;
      },
      removeListener() {
        return undefined;
      },
      dispatchEvent() {
        return true;
      }
    } as MediaQueryList;
    const localStorage = {
      get length() {
        return storage.size;
      },
      clear() {
        storage.clear();
      },
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      key(index: number) {
        return Array.from(storage.keys())[index] ?? null;
      },
      removeItem(key: string) {
        storage.delete(key);
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      }
    } satisfies Storage;

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        matchMedia() {
          return media;
        }
      }
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: root
      }
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorage
    });

    try {
      const controller = createThemeModeController('system');
      const stop = controller.mount();

      expect(get(controller.preference)).toBe('system');
      expect(get(controller.mode)).toBe('dark');
      expect(root.dataset.theme).toBe('dark');
      expect(localStorage.getItem('svedocs-theme')).toBeNull();

      prefersDark = false;
      mediaListener?.({ matches: false } as MediaQueryListEvent);

      expect(get(controller.mode)).toBe('light');

      controller.apply('dark');
      expect(get(controller.preference)).toBe('dark');
      expect(localStorage.getItem('svedocs-theme')).toBe('dark');

      prefersDark = false;
      mediaListener?.({ matches: false } as MediaQueryListEvent);
      expect(get(controller.mode)).toBe('dark');

      controller.setPreference('system');
      expect(localStorage.getItem('svedocs-theme')).toBe('system');
      expect(get(controller.mode)).toBe('light');

      prefersDark = true;
      mediaListener?.({ matches: true } as MediaQueryListEvent);
      expect(get(controller.mode)).toBe('dark');

      stop();
    } finally {
      restoreGlobalProperty('window', originalWindow);
      restoreGlobalProperty('document', originalDocument);
      restoreGlobalProperty('localStorage', originalLocalStorage);
    }
  });

  it('keeps theme mode usable when browser preference APIs are blocked', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const root = { dataset: {} as Record<string, string>, style: {} as { colorScheme?: string } };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        matchMedia() {
          throw new Error('matchMedia is blocked');
        }
      }
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: root
      }
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage is blocked');
      }
    });

    try {
      const controller = createThemeModeController('system');

      expect(() => controller.mount()).not.toThrow();
      expect(get(controller.mode)).toBe('light');
      expect(() => controller.apply('dark')).not.toThrow();
      expect(get(controller.mode)).toBe('dark');
      expect(root.dataset.theme).toBe('dark');
    } finally {
      restoreGlobalProperty('window', originalWindow);
      restoreGlobalProperty('document', originalDocument);
      restoreGlobalProperty('localStorage', originalLocalStorage);
    }
  });

  it('generates virtual theme component imports from Vite plugin options', async () => {
    const plugin = svedocs({
      config: {
        content: {
          root: 'content'
        }
      },
      theme: {
        components: {
          Layout: '$lib/theme/Layout.svelte',
          DocsShell: '$lib/theme/DocsShell.svelte',
          PageShell: '$lib/theme/PageShell.svelte',
          Error: '$lib/theme/Error.svelte',
          Brand: '$lib/theme/Brand.svelte',
          Navbar: '$lib/theme/Navbar.svelte',
          Article: '$lib/theme/Article.svelte',
          Search: '$lib/theme/Search.svelte',
          AskAi: '$lib/theme/AskAi.svelte',
          RenderError: '$lib/theme/RenderError.svelte'
        }
      }
    }) as unknown as {
      configResolved(config: { root: string }): Promise<void>;
      resolveId(id: string): string | undefined;
      load(id: string): Promise<string> | string;
    };
    const root = new URL('fixtures/custom-theme', import.meta.url).pathname;

    await plugin.configResolved?.({ root } as never);
    const resolvedId = plugin.resolveId?.('virtual:svedocs/theme-components') as string | undefined;
    const loaded = await plugin.load?.('\0virtual:svedocs/theme-components') as string;

    expect(resolvedId).toBe('\0virtual:svedocs/theme-components');
    expect(loaded).toContain('import C0 from "$lib/theme/Layout.svelte";');
    expect(loaded).toContain('"Layout": C0');
    expect(loaded).toContain('"Error": C3');
    expect(loaded).toContain('"Navbar": C5');
    expect(loaded).toContain('"AskAi": C8');
    expect(loaded).toContain('"RenderError": C9');
  });

  it('loads server-only virtual config from the source module to preserve functions', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-server-config-'));
    try {
      await mkdir(path.join(tmp, 'content/docs'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/index.md'), '# Home\n\nWelcome.', 'utf8');
      await writeFile(path.join(tmp, 'svedocs.config.mjs'), [
        'export default {',
        '  site: { url: "https://example.test" },',
        '  seo: { ogImage: { template: (input) => ({ type: "div", props: { children: input.title } }) } }',
        '};'
      ].join('\n'), 'utf8');
      const plugin = svedocs() as unknown as {
        configResolved(config: { root: string }): Promise<void>;
        load(id: string): Promise<string> | string;
      };
      await plugin.configResolved({ root: tmp });
      const loaded = await plugin.load('\0virtual:svedocs/server-config');

      expect(loaded).toContain('svedocs.config.mjs');
      expect(loaded).toContain('loadSvedocsConfig(userConfig)');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('fails fast when Vite theme component override keys are unknown', () => {
    expect(() => svedocs({
      config: {
        content: {
          root: 'content'
        }
      },
      theme: {
        components: {
          NavBar: '$lib/theme/Navbar.svelte'
        } as never
      }
    })).toThrow(/Unknown svedocs theme component key: "NavBar".*Navbar/);
  });

  it('loads content from fixture files', async () => {
    const manifest = await loadSvedocsContent({
      projectRoot: new URL('fixtures/basic', import.meta.url).pathname,
      config: {
        content: {
          docs: 'content/docs',
          pages: 'content/pages'
        },
        seo: {
          sitemap: false
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

  it('validates raw content config before resolving it', async () => {
    await expect(loadSvedocsContent({
      projectRoot: new URL('fixtures/basic', import.meta.url).pathname,
      config: { ai: { maxResults: -1 } }
    })).rejects.toThrow();
  });

  it('disambiguates colliding page IDs and OG asset paths', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-collision-'));
    try {
      await mkdir(path.join(tmp, 'content/docs/a'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/a-b.md'), '# Flat\n\nFlat page.', 'utf8');
      await writeFile(path.join(tmp, 'content/docs/a/b.md'), '# Nested\n\nNested page.', 'utf8');
      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: { site: { url: 'https://example.test' } }
      });
      const ids = manifest.pages.map((page) => page.id);
      const ogPaths = manifest.pages.map((page) => createPageOgImagePath(page));

      expect(new Set(ids).size).toBe(2);
      expect(new Set(ogPaths).size).toBe(2);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('honors the slug frontmatter as the final route segment', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-slug-'));
    try {
      await mkdir(path.join(tmp, 'content/docs/guides'), { recursive: true });
      await mkdir(path.join(tmp, 'content/pages'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/guides/deploy.md'), [
        '---',
        'title: Deploy',
        'slug: ship-to-production',
        '---',
        '',
        'Deploy the app.'
      ].join('\n'), 'utf8');
      await writeFile(path.join(tmp, 'content/pages/changelog.md'), [
        '---',
        'title: Changelog',
        'slug: releases',
        '---',
        '',
        'Release notes.'
      ].join('\n'), 'utf8');
      await writeFile(path.join(tmp, 'content/pages/status.md'), [
        '---',
        'title: Status',
        'slug: 404',
        '---',
        '',
        'Status page.'
      ].join('\n'), 'utf8');
      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: { site: { url: 'https://example.test' } }
      });
      const deploy = manifest.pages.find((page) => page.title === 'Deploy');
      const changelog = manifest.pages.find((page) => page.title === 'Changelog');

      expect(deploy?.routePath).toBe('/docs/guides/ship-to-production');
      expect(deploy?.slug).toEqual(['docs', 'guides', 'ship-to-production']);
      expect(deploy?.scopePath).toBe('/docs/guides/deploy');
      expect(deploy?.seo.canonical).toBe('https://example.test/docs/guides/ship-to-production');
      expect(changelog?.routePath).toBe('/releases');
      // Numeric YAML scalars are coerced to strings.
      expect(manifest.pages.find((page) => page.title === 'Status')?.routePath).toBe('/404');
      expect(manifest.issues.filter((issue) => issue.code === 'invalid-slug')).toHaveLength(0);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rejects invalid slug frontmatter and keeps the file-based route', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-bad-slug-'));
    try {
      await mkdir(path.join(tmp, 'content/docs'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/deploy.md'), [
        '---',
        'title: Deploy',
        'slug: nested/deploy',
        '---',
        '',
        'Deploy the app.'
      ].join('\n'), 'utf8');
      await writeFile(path.join(tmp, 'content/docs/reserved.md'), [
        '---',
        'title: Reserved',
        'slug: index',
        '---',
        '',
        'Reserved slug.'
      ].join('\n'), 'utf8');
      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: { site: { url: 'https://example.test' } }
      });
      const deploy = manifest.pages.find((page) => page.title === 'Deploy');
      const reserved = manifest.pages.find((page) => page.title === 'Reserved');

      expect(deploy?.routePath).toBe('/docs/deploy');
      expect(reserved?.routePath).toBe('/docs/reserved');
      expect(manifest.issues.some((issue) => issue.code === 'invalid-slug' && issue.sourcePath?.endsWith('deploy.md'))).toBe(true);
      expect(manifest.issues.some((issue) => issue.code === 'invalid-slug' && issue.sourcePath?.endsWith('reserved.md'))).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('keeps scope pairing file-based when translations use different slugs', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-slug-i18n-'));
    try {
      await mkdir(path.join(tmp, 'content/docs/guides'), { recursive: true });
      await mkdir(path.join(tmp, 'content/docs/zh/guides'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/guides/deploy.md'), [
        '---',
        'title: Deploy',
        'slug: ship',
        '---',
        '',
        'Deploy the app. [Self](/docs/guides/deploy)'
      ].join('\n'), 'utf8');
      await writeFile(path.join(tmp, 'content/docs/zh/guides/deploy.md'), [
        '---',
        'title: 部署',
        'slug: bushu',
        '---',
        '',
        '部署应用。'
      ].join('\n'), 'utf8');
      await writeFile(path.join(tmp, 'content/docs/zh/index.md'), [
        '---',
        'title: 文档首页',
        'slug: ignored-root',
        '---',
        '',
        '首页。'
      ].join('\n'), 'utf8');
      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: {
          site: { url: 'https://example.test' },
          i18n: { defaultLocale: 'en', locales: ['en', 'zh'] },
          checks: { translations: true }
        }
      });
      const en = manifest.pages.find((page) => page.title === 'Deploy');
      const zh = manifest.pages.find((page) => page.title === '部署');
      const zhRoot = manifest.pages.find((page) => page.title === '文档首页');

      expect(en?.routePath).toBe('/docs/guides/ship');
      expect(zh?.routePath).toBe('/docs/zh/guides/bushu');
      expect(en?.scopePath).toBe('/docs/guides/deploy');
      expect(zh?.scopePath).toBe('/docs/guides/deploy');
      // A slug on a locale root index is ignored; the locale segment is preserved.
      expect(zhRoot?.routePath).toBe('/docs/zh');
      expect(zhRoot?.locale).toBe('zh');
      // File-based links still resolve to the slugged route.
      expect(en?.html).toContain('href="/docs/guides/ship"');
      // Translations pair by file-based scopePath, so per-locale slugs raise no warnings.
      expect(manifest.issues.filter((issue) => issue.code === 'missing-translation' && issue.sourcePath?.includes('deploy'))).toHaveLength(0);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('reports malformed percent-encoded anchors without aborting content loading', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-bad-anchor-'));
    try {
      await mkdir(path.join(tmp, 'content/docs'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/index.md'), '# Home\n\n[Broken](#bad%ZZ)', 'utf8');
      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: { site: { url: 'https://example.test' } }
      });

      expect(manifest.issues.some((issue) => issue.code === 'broken-anchor' && issue.message.includes('invalid'))).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('loads serializable SEO head injections from frontmatter', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-seo-head-'));
    try {
      await mkdir(path.join(tmp, 'content/docs'), { recursive: true });
      await mkdir(path.join(tmp, 'content/pages'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/index.md'), [
        '---',
        'title: SEO Head',
        'description: Custom SEO head metadata.',
        'keywords:',
        '  - docs',
        '  - seo',
        'robots: noindex,nofollow',
        'head:',
        '  meta:',
        '    - name: google-site-verification',
        '      content: page-token',
        '    - property: custom:page',
        '      content: seo-head',
        '  links:',
        '    - rel: alternate',
        '      href: /feed.xml',
        '      type: application/rss+xml',
        '      title: Feed',
        '  json-ld:',
        '    - "@type": FAQPage',
        '      name: SEO FAQ',
        '---',
        '# SEO Head',
        '',
        'Body.'
      ].join('\n'), 'utf8');
      await writeFile(path.join(tmp, 'content/pages/index.md'), [
        '---',
        'title: Home',
        'description: Home page.',
        '---',
        '# Home'
      ].join('\n'), 'utf8');

      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: {
          content: {
            docs: 'content/docs',
            pages: 'content/pages'
          }
        }
      });
      const page = manifest.pages.find((candidate) => candidate.routePath === '/docs');

      expect(page?.seo.keywords).toEqual(['docs', 'seo']);
      expect(page?.seo.robots).toBe('noindex,nofollow');
      expect(page?.seo.head?.meta).toEqual([
        { name: 'google-site-verification', content: 'page-token' },
        { property: 'custom:page', content: 'seo-head' }
      ]);
      expect(page?.seo.head?.links).toEqual([
        { rel: 'alternate', href: '/feed.xml', type: 'application/rss+xml', title: 'Feed' }
      ]);
      expect(page?.seo.head?.jsonLd).toEqual([
        { '@type': 'FAQPage', name: 'SEO FAQ' }
      ]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
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

  it('loads locale scoped docs', async () => {
    const manifest = await loadSvedocsContent({
      projectRoot: new URL('fixtures/i18n', import.meta.url).pathname,
      config: {
        site: {
          url: 'https://fixture.test'
        },
        i18n: {
          defaultLocale: 'en',
          locales: [
            { code: 'en', label: 'English', hreflang: 'en' },
            { code: 'zh', label: '中文', hreflang: 'zh-CN' }
          ],
          messages: {
            zh: {
              'code.copy': '复制代码'
            }
          }
        },
      }
    });

    expect(manifest.pages.map((page) => [page.routePath, page.locale])).toEqual([
      ['/docs', 'en'],
      ['/docs/zh', 'zh']
    ]);
    expect(manifest.pages.find((page) => page.routePath === '/docs')?.next).toBeUndefined();
    expect(manifest.search.find((record) => record.url === '/docs/zh')?.metadata).toMatchObject({
      locale: 'zh',
      kind: 'doc'
    });
    expect(manifest.pages.find((page) => page.routePath === '/docs/zh')?.html).toContain('aria-label="复制代码"');
    expect(createPageTree(manifest.pages.filter((page) => page.locale === 'zh'))).toEqual([
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
      ['zh-CN', 'https://fixture.test/docs/zh'],
      ['x-default', 'https://fixture.test/docs']
    ]);
    expect(manifest.issues).toEqual([]);
  });

  it('keeps locale codes separate from source and route paths', async () => {
    const manifest = await loadSvedocsContent({
      projectRoot: new URL('fixtures/i18n', import.meta.url).pathname,
      config: {
        i18n: {
          defaultLocale: 'en-US',
          prefixDefaultLocale: true,
          locales: [
            { code: 'en-US', path: 'en', label: 'English', hreflang: 'en-US' },
            { code: 'zh-Hans', path: 'zh', label: '中文', hreflang: 'zh-CN' }
          ]
        }
      }
    });

    expect(manifest.pages.map((page) => [page.routePath, page.scopePath, page.locale])).toEqual([
      ['/docs/en', '/docs', 'en-US'],
      ['/docs/zh', '/docs', 'zh-Hans']
    ]);
    expect(manifest.search.map((record) => record.metadata.locale)).toContain('zh-Hans');
  });

  it('keeps mirrored locale docs free of translation issues', async () => {
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
        checks: {
          translations: true
        },
        seo: {
          sitemap: false
        }
      }
    });

    expect(manifest.issues).toEqual([]);
  });

  it('rewrites localized markdown links and falls back to default-locale routes', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-i18n-links-'));
    try {
      await mkdir(path.join(tmp, 'content/docs/en'), { recursive: true });
      await mkdir(path.join(tmp, 'content/docs/zh'), { recursive: true });
      await mkdir(path.join(tmp, 'content/pages/en'), { recursive: true });
      await mkdir(path.join(tmp, 'content/pages/zh'), { recursive: true });
      await writeFile(path.join(tmp, 'content/docs/en/index.md'), '---\ndescription: Docs.\n---\n# Docs\n', 'utf8');
      await writeFile(path.join(tmp, 'content/docs/en/api.md'), '---\ndescription: API.\n---\n# API\n', 'utf8');
      await writeFile(path.join(tmp, 'content/docs/en/install.md'), '---\ndescription: Install.\n---\n# Install\n\n## Requirements\n', 'utf8');
      await writeFile(
        path.join(tmp, 'content/docs/zh/index.md'),
        '---\ndescription: 中文文档。\n---\n# 中文文档\n\n[API](./api.md) [安装](./install.md#requirements) [关于](/about)\n',
        'utf8'
      );
      await writeFile(path.join(tmp, 'content/docs/zh/api.md'), '---\ndescription: 中文 API。\n---\n# API\n', 'utf8');
      await writeFile(path.join(tmp, 'content/pages/en/about.md'), '---\ndescription: About.\n---\n# About\n', 'utf8');
      await writeFile(path.join(tmp, 'content/pages/zh/about.md'), '---\ndescription: 关于。\n---\n# 关于\n', 'utf8');
      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: {
          i18n: {
            defaultLocale: 'en',
            locales: ['en', 'zh']
          }
        }
      });
      const zhPage = manifest.pages.find((page) => page.routePath === '/docs/zh');

      expect(zhPage?.html).toContain('href="/docs/zh/api"');
      expect(zhPage?.html).toContain('href="/docs/install#requirements"');
      expect(zhPage?.html).toContain('href="/zh/about"');
      expect(manifest.issues.filter((issue) => issue.code === 'broken-link' || issue.code === 'broken-anchor')).toEqual([]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('reports missing translations for public non-doc pages', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'svedocs-i18n-pages-'));
    try {
      await mkdir(path.join(tmp, 'content/pages/en'), { recursive: true });
      await writeFile(
        path.join(tmp, 'content/pages/en/index.md'),
        '---\ntitle: Home\ndescription: Localized home.\n---\n\n# Home\n',
        'utf8'
      );
      const manifest = await loadSvedocsContent({
        projectRoot: tmp,
        config: {
          i18n: {
            defaultLocale: 'en',
            locales: ['en', 'zh']
          },
          checks: {
            translations: true
          }
        }
      });

      expect(manifest.issues).toContainEqual(expect.objectContaining({
        code: 'missing-translation',
        message: '/ is missing locale zh.'
      }));
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
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
      },
      seo: {
        head: {
          meta: [
            { name: 'google-site-verification', content: 'verify-me' }
          ],
          links: [
            { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml', title: 'Feed' }
          ],
          jsonLd: [
            { '@type': 'Organization', name: 'Fixture Org' }
          ]
        }
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
          keywords: ['docs', 'guide'],
          author: 'Docs Team',
          publishedTime: '2026-05-17T00:00:00.000Z',
          type: 'article',
          robots: 'index,follow',
          head: {
            meta: [
              { property: 'custom:page', content: 'guide' }
            ],
            links: [
              { rel: 'preload', href: '/fonts/docs.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
            ],
            jsonLd: [
              { '@type': 'BreadcrumbList', name: 'Guide breadcrumb' }
            ]
          }
        }
      });

    const metadata = createPageMetadata(config, page);

      expect(metadata.title).toBe('Guide | Fixture');
      expect(metadata.openGraph.type).toBe('article');
      expect(metadata.openGraph.author).toBe('Docs Team');
    expect(metadata.openGraph.publishedTime).toBe('2026-05-17T00:00:00.000Z');
    expect(metadata.openGraph.locale).toBe('en');
    expect(metadata.jsonLd.dateModified).toBe('2026-05-18T00:00:00.000Z');
    expect(metadata.jsonLd.inLanguage).toBe('en');
    expect(metadata.openGraph.image).toBe(`https://fixture.test${createPageOgImagePath(page)}`);
      expect(metadata.keywords).toEqual(['docs', 'guide']);
      expect(metadata.robots).toBe('index,follow');
      expect(metadata.head.meta).toEqual([
        { name: 'google-site-verification', content: 'verify-me' },
        { property: 'custom:page', content: 'guide' }
      ]);
      expect(metadata.head.links).toEqual([
        { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml', title: 'Feed' },
        { rel: 'preload', href: '/fonts/docs.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
      ]);
      expect(metadata.head.jsonLd).toEqual([
        { '@type': 'Organization', name: 'Fixture Org' },
        { '@type': 'BreadcrumbList', name: 'Guide breadcrumb' }
      ]);
    expect(createPageOgImagePath(page)).toMatch(/^\/og\/docs-guide-[a-f0-9]{16}\.svg$/);
    expect((await createPageOgImageResponse(config, page)).headers.get('content-type')).toContain('image/svg+xml');
    expect(createSitemapXml(config, [page])).toContain('<loc>https://fixture.test/docs/guide</loc>');
    expect(createSitemapXml(config, [page])).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(createRobotsTxt(config)).toContain('Sitemap: https://fixture.test/sitemap.xml');
    expect(createRobotsTxt(resolveSvedocsConfig({ site: { url: 'https://fixture.test' }, seo: { sitemap: false } }))).not.toContain('Sitemap:');
    const sitemapResponse = createSitemapResponse(config, [page]);
    expect(sitemapResponse.headers.get('cache-control')).toContain('s-maxage=3600');
    const sitemapEtag = sitemapResponse.headers.get('etag');
    expect(sitemapEtag).toBeTruthy();
    expect(createSitemapResponse(config, [page], new Request('https://fixture.test/sitemap.xml', {
      headers: { 'if-none-match': sitemapEtag! }
    })).status).toBe(304);
    expect(createSitemapResponse(config, [page], new Request('https://fixture.test/sitemap.xml', {
      headers: { 'if-none-match': sitemapEtag!.replace(/^W\//, '') }
    })).status).toBe(304);
    expect(await (createSitemapResponse(resolveSvedocsConfig({ seo: { sitemap: false } }), [page])).text()).toBe('Sitemap is disabled.');
    expect(createSitemapResponse(resolveSvedocsConfig({ seo: { sitemap: false } }), [page]).status).toBe(404);
    expect(createRobotsResponse(resolveSvedocsConfig({ seo: { robots: false } })).status).toBe(404);
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
  }, 15_000);

  it('creates an opt-in RSS feed from discoverable pages', () => {
    const config = resolveSvedocsConfig({
      site: {
        name: 'Fixture',
        description: 'Fixture updates',
        url: 'https://fixture.test'
      },
      seo: {
        rss: {
          title: 'Fixture feed',
          limit: 1,
          locale: 'en'
        }
      },
      i18n: {
        defaultLocale: 'en',
        locales: [
          { code: 'en', label: 'English', hreflang: 'en' },
          { code: 'zh', label: 'Chinese', hreflang: 'zh-CN' }
        ]
      }
    });
    const current = createFixturePage({
      id: 'current',
      title: 'Current release',
      routePath: '/releases/current',
      scopePath: '/releases/current',
      locale: 'en',
      description: 'Current release notes.',
      lastUpdated: '2026-06-02T00:00:00.000Z',
      seo: {
        title: 'Current release',
        description: 'Current release notes.',
        canonical: '/releases/current',
        publishedTime: '2026-06-01T00:00:00.000Z'
      }
    });
    const older = createFixturePage({
      id: 'older',
      title: 'Older release',
      routePath: '/releases/older',
      scopePath: '/releases/older',
      locale: 'en',
      lastUpdated: '2026-05-01T00:00:00.000Z'
    });
    const noindex = createFixturePage({
      id: 'private',
      title: 'Private release',
      routePath: '/releases/private',
      scopePath: '/releases/private',
      locale: 'en',
      lastUpdated: '2026-07-01T00:00:00.000Z',
      seo: { title: 'Private release', robots: 'noindex,follow' }
    });
    const translated = createFixturePage({
      id: 'translated',
      title: 'Translated release',
      routePath: '/zh/releases/current',
      scopePath: '/releases/current',
      locale: 'zh',
      lastUpdated: '2026-07-02T00:00:00.000Z'
    });

    const rss = createRssXml(config, [older, noindex, translated, current]);
    expect(rss).toContain('<title>Fixture feed</title>');
    expect(rss).toContain('<link>https://fixture.test/releases/current</link>');
    expect(rss).toContain('<language>en</language>');
    expect(rss).not.toContain('Older release');
    expect(rss).not.toContain('Private release');
    expect(rss).not.toContain('Translated release');
    expect(createPageMetadata(config, current).head.links).toContainEqual({
      rel: 'alternate',
      type: 'application/rss+xml',
      href: 'https://fixture.test/feed.xml',
      title: 'Fixture feed'
    });
    expect(createRssResponse(config, [current]).headers.get('content-type')).toContain('application/rss+xml');
    expect(createRssResponse(resolveSvedocsConfig(), [current]).status).toBe(404);
    expect(createSitemapXml(config, [current])).toContain('<loc>https://fixture.test/releases/current</loc>');
    expect(createSitemapXml(config, [current, noindex])).not.toContain('/releases/private');

    const singleLocaleRss = createRssXml(resolveSvedocsConfig({
      site: { url: 'https://fixture.test' },
      seo: { rss: { locale: 'en' } }
    }), [older]);
    expect(singleLocaleRss).toContain('<title>Older release</title>');
  });

  it('creates locale-aware SEO metadata and sitemap alternates', () => {
    const config = resolveSvedocsConfig({
      site: {
        name: 'Fixture',
        url: 'https://fixture.test'
      },
      i18n: {
        defaultLocale: 'en',
        locales: [
          { code: 'en', label: 'English', hreflang: 'en' },
          { code: 'zh', label: '中文', hreflang: 'zh-CN' }
        ]
      }
    });
    const enPage = createFixturePage({
      id: 'guide-en',
      routePath: '/docs/guide',
      scopePath: '/docs/guide',
      locale: 'en',
      kind: 'doc',
      title: 'Guide',
      seo: { title: 'Guide' }
    });
    const zhPage = createFixturePage({
      id: 'guide-zh',
      routePath: '/docs/zh/guide',
      scopePath: '/docs/guide',
      locale: 'zh',
      kind: 'doc',
      title: '指南',
      seo: { title: '指南' }
    });
    const standalonePage = createFixturePage({
      id: 'guide-page-en',
      routePath: '/guide',
      scopePath: '/docs/guide',
      locale: 'en',
      kind: 'page',
      title: 'Standalone guide',
      seo: { title: 'Standalone guide' }
    });

    const metadata = createPageMetadata(config, zhPage, [enPage, zhPage, standalonePage]);
    const alternates = createPageAlternates(config, zhPage, [enPage, zhPage, standalonePage]);
    const sitemap = createSitemapXml(config, [enPage, zhPage, standalonePage]);

    expect(metadata.canonical).toBe('https://fixture.test/docs/zh/guide');
    expect(metadata.openGraph.locale).toBe('zh_CN');
    expect(metadata.openGraph.alternateLocales).toEqual(['en']);
    expect(createPageMetadata(config, zhPage, [zhPage]).openGraph.alternateLocales).toBeUndefined();
    expect(metadata.jsonLd.inLanguage).toBe('zh-CN');
    expect(alternates.map((alternate) => [alternate.lang, alternate.href])).toEqual([
      ['en', 'https://fixture.test/docs/guide'],
      ['zh-CN', 'https://fixture.test/docs/zh/guide'],
      ['x-default', 'https://fixture.test/docs/guide']
    ]);
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="zh-CN" href="https://fixture.test/docs/zh/guide" />');
    expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://fixture.test/docs/guide" />');
  });

  it('normalizes every Open Graph locale separator', () => {
    const config = resolveSvedocsConfig({
      i18n: {
        defaultLocale: 'zh-Hans-CN',
        locales: ['zh-Hans-CN']
      }
    });
    const page = createFixturePage({
      locale: 'zh-Hans-CN',
      seo: { title: 'Guide' }
    });

    expect(createPageMetadata(config, page).openGraph.locale).toBe('zh_Hans_CN');
  });

  it('normalizes generated SEO URLs for static output and serializes JSON-LD safely', async () => {
    const config = resolveSvedocsConfig({
      site: {
        name: 'Fixture',
        url: 'https://fixture.test'
      },
      build: {
        mode: 'static'
      },
      seo: {
        ogImage: false
      }
    });
    const page = createFixturePage({
      routePath: '/docs/guide',
      kind: 'doc',
      title: 'Guide',
      description: 'Read the guide.',
      seo: {
        title: 'Guide',
        description: 'Read the guide.'
      }
    });
    const metadata = createPageMetadata(config, page);

    expect(metadata.canonical).toBe('https://fixture.test/docs/guide/');
    expect(metadata.openGraph.url).toBe('https://fixture.test/docs/guide/');
    expect(createSitemapXml(config, [page])).toContain('<loc>https://fixture.test/docs/guide/</loc>');
    expect(metadata.openGraph.image).toBeUndefined();
    expect(createConfiguredPageOgImageEntries(config, [page])).toEqual([]);
    expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).toContain('\\u003c/script\\u003e');
    expect(createJsonLdScript({ '@type': 'Thing', name: 'Guide' })).toContain('<script type="application/ld+json">');
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
    expect(metadata.openGraph.image).toBe(`https://fixture.test${createPageOgImagePath(page, 'png')}`);
    expect(createPageOgImagePath(page, createConfiguredOgImageFormat(config))).toMatch(/^\/og\/docs-guide-[a-f0-9]{16}\.png$/);
    expect(response.headers.get('content-type')).toContain('image/png');
  }, 15_000);

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
        metadata: { locale: 'en', kind: 'doc' }
      },
      {
        id: 'zh-install',
        pageId: 'zh-install',
        url: '/docs/zh/install',
        title: '安装',
        section: 'Cloudflare 部署',
        content: '使用 Cloudflare Pages 部署 svedocs。',
        metadata: { locale: 'zh', kind: 'doc' }
      }
    ];
    const scoped = searchRecords(records, { query: 'cloudflare', locale: 'zh' });
    const response = await createSearchResponse(
      records,
      new Request('https://example.test/api/search?q=install&locale=en')
    );
    const json = await response.json() as { results: Array<{ id: string }> };

    expect(scoped.map((result) => result.id)).toEqual(['zh-install']);
    expect(searchRecords(records, { query: 'instal' })[0]?.id).toBe('en-install');
    expect(json.results.map((result) => result.id)).toEqual(['en-install']);
  });

  it('searches CJK content without whitespace token boundaries', () => {
    const records = [
      {
        id: 'zh-runtime',
        pageId: 'zh-runtime',
        url: '/docs/zh/runtime',
        title: '运行环境',
        content: '这里说明如何配置运行时凭据并回退到本地搜索。',
        metadata: { locale: 'zh', kind: 'doc' }
      },
      {
        id: 'en-runtime',
        pageId: 'en-runtime',
        url: '/docs/runtime',
        title: 'Runtime',
        content: 'Configure runtime credentials and local search fallback.',
        metadata: { locale: 'en', kind: 'doc' }
      }
    ];

    expect(searchRecords(records, { query: '凭据' }).map((result) => result.id)).toEqual(['zh-runtime']);
    expect(searchRecords(records, { query: '本地搜索' }).map((result) => result.id)).toEqual(['zh-runtime']);
    expect(searchRecords(records, { query: '运行时凭据', locale: 'zh' })[0]?.id).toBe('zh-runtime');
  });

  it('falls back to partial local matches when no record contains every query term', () => {
    const records = [
      {
        id: 'local-search',
        pageId: 'search',
        url: '/docs/search',
        title: 'Search',
        content: 'Local search indexes pages and sections.',
        metadata: { kind: 'doc' }
      },
      {
        id: 'ask-ai',
        pageId: 'ask',
        url: '/docs/ask-ai',
        title: 'Ask AI',
        content: 'Answers questions with citations.',
        metadata: { kind: 'doc' }
      }
    ];

    const results = searchRecords(records, { query: 'search ai', limit: 2 });

    expect(results.map((result) => result.id).sort()).toEqual(['ask-ai', 'local-search']);
  });

  it('normalizes Cloudflare AI Search chunk results', async () => {
    let scopedFilters: Record<string, unknown> | undefined;
    const provider = createCloudflareAiSearchProvider({
      binding: {
        async search(input) {
          expect(input.query).toBeUndefined();
          scopedFilters = input.ai_search_options?.retrieval?.filters;
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
                    locale: 'zh'
                  }
                }
              }
            ]
          };
        }
      }
    });

    const results = await provider.search({ query: 'pnpm', limit: 1 });
    const scoped = await provider.search({ query: 'pnpm', locale: 'zh' });

    expect(results[0]).toMatchObject({
      title: 'Install',
      url: '/docs/install#package-manager',
      section: 'Package manager',
      score: 0.9
    });
    expect(results[0]?.excerpt).toContain('pnpm');
    expect(scopedFilters).toEqual({ locale: 'zh' });
    expect(scoped.map((result) => result.url)).toEqual(['/docs/zh/install']);
  });

  it('does not probe direct Cloudflare AI Search RPC bindings for namespace methods', async () => {
    let getCalls = 0;
    const binding = new Proxy({
      async search() {
        return {
          chunks: [{
            text: 'Direct instance result.',
            item: { metadata: { title: 'Direct', url: '/docs/direct' } }
          }]
        };
      }
    }, {
      has(target, property) {
        return property === 'get' || Reflect.has(target, property);
      },
      get(target, property, receiver) {
        if (property === 'get') {
          return () => {
            getCalls += 1;
            throw new Error('The RPC receiver does not implement the method "get".');
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });
    const provider = createCloudflareAiSearchProvider({ binding });

    const results = await provider.search({ query: 'direct' });

    expect(getCalls).toBe(0);
    expect(results[0]?.url).toBe('/docs/direct');
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
                kind: 'doc'
              }
            }
          ]
        });
      }
    });

    const results = await provider.search({ query: 'cloudflare', limit: 3, locale: 'en' });

    expect(requestedUrl?.pathname).toBe('/collections/docs_en/documents/search');
    expect(requestedUrl?.searchParams.get('q')).toBe('cloudflare');
    expect(requestedUrl?.searchParams.get('query_by')).toBe('title,section,content');
    expect(requestedUrl?.searchParams.get('per_page')).toBe('3');
    expect(requestedUrl?.searchParams.get('filter_by')).toBeNull();
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
        metadata: { locale: 'en', kind: 'doc' }
      }
    ];
    const algoliaConfig = resolveSvedocsConfig({ search: { provider: 'algolia' } });
    let algoliaBody: { filters?: string } | undefined;
    const algoliaResponse = await createConfiguredSearchResponse(
      algoliaConfig,
      records,
      new Request('https://example.test/api/search?q=svedocs&provider=algolia&locale=en'),
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
                kind: 'doc'
              }
            ]
          });
        }
      }
    );
    const algoliaJson = await algoliaResponse.json() as { provider?: string; results: Array<{ id: string }> };
    let overrideCalledRemote = false;
    const localResponse = await createConfiguredSearchResponse(
      resolveSvedocsConfig({ search: { provider: 'local' } }),
      records,
      new Request('https://example.test/api/search?q=svedocs&provider=algolia'),
      {
        env: {
          ALGOLIA_APP_ID: 'APP',
          ALGOLIA_SEARCH_KEY: 'key',
          ALGOLIA_INDEX_NAME: 'docs'
        },
        async fetch() {
          overrideCalledRemote = true;
          return Response.json({ hits: [] });
        }
      }
    );
    const localJson = await localResponse.json() as { results: Array<{ id: string }> };
    const typesenseProvider = createConfiguredSearchProvider({
      config: resolveSvedocsConfig({ search: { provider: 'typesense' } }),
      records,
      env: {}
    });

    expect(algoliaBody?.filters).toBe('locale:en');
    expect(algoliaJson.provider).toBe('algolia');
    expect(algoliaJson.results[0]?.id).toBe('algolia-install');
    expect(overrideCalledRemote).toBe(false);
    expect(localJson.results[0]?.id).toBe('local-install');
    expect(typesenseProvider.name).toBe('local-json');
  });

  it('routes configured Cloudflare AI Search bindings from named env', async () => {
    const config = resolveSvedocsConfig({
      search: { provider: 'cloudflare-ai-search' },
      cloudflare: { aiSearch: { binding: 'DOCS_SEARCH', instanceName: 'docs', namespace: 'production-docs' } }
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
    expect(compiled.html).toContain('sd-diff-panes');
    expect(compiled.html).toContain('sd-diff-scroll');
    expect(compiled.html).toContain('data-side="old"');
    expect(compiled.html).toContain('data-side="new"');
  });

  it('renders localized markdown code and diff labels', async () => {
    const compiled = await compileMarkdown('```diff split title="更新.patch"\n@@ -1 +1 @@\n-old\n+new\n```', {
      messages: {
        'code.copy': '复制代码',
        'code.copyDiff': '复制 diff',
        'diff.label': '差异',
        'diff.aria': '{title} 差异',
        'diff.before': '之前',
        'diff.after': '之后'
      }
    });

    expect(compiled.html).toContain('aria-label="复制 diff"');
    expect(compiled.html).toContain('aria-label="更新.patch 差异"');
    expect(compiled.html).toContain('aria-label="之前"');
    expect(compiled.html).toContain('aria-label="之后"');
    expect(compiled.html).toContain('>差异</span>');
  });

  it('escapes localized diff labels before rendering HTML', async () => {
    const compiled = await compileMarkdown('```diff split\n-old\n+new\n```', {
      messages: {
        'code.copy': 'Copy code',
        'code.copyDiff': 'Copy diff',
        'diff.label': 'Diff',
        'diff.aria': '{title} diff',
        'diff.before': 'Before <unsafe>',
        'diff.after': 'After "unsafe"'
      }
    });

    expect(compiled.html).toContain('aria-label="Before <unsafe>"');
    expect(compiled.html).toContain('>Before &#x3C;unsafe></div>');
    expect(compiled.html).toContain('aria-label="After &#x22;unsafe&#x22;"');
    expect(compiled.html).toContain('>After "unsafe"</div>');
    expect(compiled.html).not.toContain('<unsafe></');
  });

  it('preserves blank lines in highlighted code blocks', async () => {
    const compiled = await compileMarkdown('```ts\nconst one = 1;\n\nconst two = 2;\n```');

    expect(compiled.html).toContain('data-line="2"');
    expect(compiled.html).toContain('data-empty="true"');
    expect(compiled.html).toContain('<span class="sd-line-content" data-empty="true"></span></span><span class="line" data-line="3"');
    expect(compiled.html).toContain('data-line="3"');
  });

  it('keeps unified diff lines as siblings', async () => {
    const compiled = await compileMarkdown('```diff\n-old\n+new\n```');

    expect(compiled.html).toContain('data-line="1" data-diff-kind="remove"');
    expect(compiled.html).toContain('</span></span><span class="line sd-line-add" data-line="2" data-diff-kind="add"');
  });

  it('adds external link icons and renders internal link cards', async () => {
    const compiled = await compileMarkdown([
      'Read [SvelteKit](https://svelte.dev/docs/kit).',
      '',
      '[SEO and OG](/docs/integrations/seo-og "card: Metadata, sitemap, and robots.")'
    ].join('\n'));

    expect(compiled.html).toContain('class="sd-external-link"');
    expect(compiled.html).toContain('class="sd-external-link-icon"');
    expect(compiled.html).toContain('class="sd-link-card-row"');
    expect(compiled.html).toContain('class="sd-link-card"');
    expect(compiled.html).toContain('class="sd-link-card-title"');
    expect(compiled.html).toContain('Metadata, sitemap, and robots.');
  });

  it('adds accessible link icons to section headings without rendering hash text', async () => {
    const compiled = await compileMarkdown([
      '# Page title',
      '',
      '## Install',
      '',
      '### Install',
      '',
      '##### Not linked'
    ].join('\n'), {
      messages: {
        'code.copy': 'Copy code',
        'code.copyDiff': 'Copy diff',
        'diff.label': 'Diff',
        'diff.aria': '{title} diff',
        'diff.before': 'Before',
        'diff.after': 'After',
        'heading.anchor': 'Link to this section'
      }
    });

    expect(compiled.html).toContain('<h2 id="install">Install<a class="sd-heading-anchor" href="#install" aria-label="Link to this section"><svg');
    expect(compiled.html).toContain('<h3 id="install-1">Install<a class="sd-heading-anchor" href="#install-1" aria-label="Link to this section"><svg');
    expect(compiled.html).not.toContain('>#</a>');
    expect(compiled.html).not.toContain('<h1 id="page-title">Page title<a');
    expect(compiled.html).not.toContain('<h5 id="not-linked">Not linked<a');
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

  it('enforces Ask AI input budgets and hides provider failures', async () => {
    const invalid = await createAskResponse(
      createMockAiProvider(),
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 42 })
      })
    );
    const oversized = await createAskResponse(
      createMockAiProvider(),
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'x'.repeat(4_001) })
      })
    );
    const invalidMessages = await createAskResponse(
      createMockAiProvider(),
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'deploy', messages: 'invalid', locale: 42 })
      })
    );
    const oversizedBody = await createAskResponse(
      createMockAiProvider(),
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'deploy', padding: 'x'.repeat(64 * 1024) })
      })
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failed = await createAskResponse(
      { name: 'failing', async ask() { throw new Error('upstream-secret-response'); } },
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'deploy' })
      })
    );
    const failureBody = await failed.text();
    errorSpy.mockRestore();

    expect(invalid.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(invalidMessages.status).toBe(400);
    expect(oversizedBody.status).toBe(413);
    expect(failed.status).toBe(500);
    expect(failureBody).not.toContain('upstream-secret-response');
  });

  it('keeps memory rate limits atomic under concurrent checks', async () => {
    const limiter = createMemoryRateLimiter({ windowMs: 60_000, max: 1 });
    const request = new Request('https://example.test/api/ask');
    const results = await Promise.all([
      limiter.check({ key: 'same-client', request }),
      limiter.check({ key: 'same-client', request })
    ]);

    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(results.filter((result) => !result.allowed)).toHaveLength(1);
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
            metadata: { locale: 'en' }
          },
          {
            id: 'zh-deploy',
            pageId: 'zh-deploy',
            url: '/docs/zh/deploy',
            title: '部署',
            content: 'Deploy svedocs to Cloudflare Pages.',
            metadata: { locale: 'zh' }
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

  it('does not probe direct Cloudflare AI Search chat RPC bindings for namespace methods', async () => {
    let getCalls = 0;
    const binding = new Proxy({
      async search() {
        return { response: 'Search fallback.' };
      },
      async chatCompletions() {
        return { answer: 'Direct chat answer.' };
      }
    }, {
      has(target, property) {
        return property === 'get' || Reflect.has(target, property);
      },
      get(target, property, receiver) {
        if (property === 'get') {
          return () => {
            getCalls += 1;
            throw new Error('The RPC receiver does not implement the method "get".');
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });
    const provider = createCloudflareAiSearchAiProvider({ binding });

    const result = await provider.ask({ question: 'How do I install?' });

    expect(getCalls).toBe(0);
    expect(result.answer).toBe('Direct chat answer.');
  });

  it('passes Ask AI scope into Cloudflare AI Search retrieval filters and citations', async () => {
    let chatFilters: Record<string, unknown> | undefined;
    const provider = createCloudflareAiSearchAiProvider({
      binding: {
        async search() {
          return {
            response: 'Search fallback answer.'
          };
        },
        async chatCompletions(input) {
          chatFilters = input.ai_search_options?.retrieval?.filters;
          return {
            choices: [
              {
                message: {
                  content: 'Deploy with the localized guide.'
                }
              }
            ],
            citations: [
              {
                title: 'Native unscoped',
                url: '/docs/deploy'
              }
            ],
            chunks: [
              {
                text: 'Deploy to Cloudflare.',
                item: {
                  metadata: {
                    title: 'Deploy',
                    url: '/docs/deploy',
                    locale: 'en'
                  }
                }
              },
              {
                text: '部署到 Cloudflare。',
                item: {
                  metadata: {
                    title: '部署',
                    url: '/docs/zh/deploy',
                    locale: 'zh'
                  }
                }
              }
            ]
          };
        }
      }
    });
    let searchFilters: Record<string, unknown> | undefined;
    const fallbackProvider = createCloudflareAiSearchAiProvider({
      binding: {
        async search(input) {
          searchFilters = input.ai_search_options?.retrieval?.filters;
          return {
            response: 'Fallback answer.',
            chunks: [
              {
                text: 'Deploy docs.',
                item: {
                  metadata: {
                    title: 'Deploy',
                    url: '/docs/deploy',
                    kind: 'doc'
                  }
                }
              }
            ]
          };
        }
      }
    });

    const result = await provider.ask({ question: 'deploy', scope: { locale: 'zh' } });
    const fallback = await fallbackProvider.ask({ question: 'deploy', scope: { kind: 'doc' } });

    expect(chatFilters).toEqual({ locale: 'zh' });
    expect(result.citations.map((citation) => citation.url)).toEqual(['/docs/zh/deploy']);
    expect(searchFilters).toEqual({ kind: 'doc' });
    expect(fallback.citations.map((citation) => citation.url)).toEqual(['/docs/deploy']);
  });

  it('falls back to native Cloudflare AI Search citations for scoped Ask AI results without chunks', async () => {
    let chatFilters: Record<string, unknown> | undefined;
    const provider = createCloudflareAiSearchAiProvider({
      binding: {
        async search() {
          return {
            response: 'Search fallback answer.'
          };
        },
        async chatCompletions(input) {
          chatFilters = input.ai_search_options?.retrieval?.filters;
          return {
            answer: 'Use the localized deploy guide.',
            citations: [
              {
                title: '部署',
                url: '/docs/zh/deploy'
              }
            ]
          };
        }
      }
    });

    const result = await provider.ask({ question: 'deploy', scope: { locale: 'zh' } });

    expect(chatFilters).toEqual({ locale: 'zh' });
    expect(result.citations).toEqual([
      {
        title: '部署',
        url: '/docs/zh/deploy'
      }
    ]);
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

  it('applies configured Ask AI response option overrides to hosted providers', async () => {
    const config = resolveSvedocsConfig({
      ai: {
        provider: 'openai-compatible',
        systemPrompt: 'Config prompt.',
        maxResults: 5
      }
    });
    let requestBody: {
      messages?: Array<{ role: string; content: string }>;
    } | undefined;
    const response = await createConfiguredAskResponse(
      config,
      [
        {
          id: 'deploy',
          pageId: 'deploy',
          url: '/docs/deploy',
          title: 'Deploy',
          content: 'Deploy svedocs to Cloudflare Pages.',
          metadata: {}
        },
        {
          id: 'install',
          pageId: 'install',
          url: '/docs/install',
          title: 'Install',
          content: 'Install svedocs with pnpm.',
          metadata: {}
        }
      ],
      new Request('https://example.test/api/ask', {
        method: 'POST',
        body: JSON.stringify({ question: 'svedocs' })
      }),
      {
        systemPrompt: 'Override prompt.',
        maxResults: 1,
        env: {
          OPENAI_COMPATIBLE_API_KEY: 'key',
          OPENAI_COMPATIBLE_BASE_URL: 'https://llm.example.test/v1',
          OPENAI_COMPATIBLE_MODEL: 'provider/model'
        },
        async fetch(_input, init) {
          requestBody = JSON.parse(String(init?.body));
          return Response.json({ choices: [{ message: { content: 'Use the override.' } }] });
        }
      }
    );
    const json = await response.json() as { answer: string; citations: Array<{ url: string }> };

    expect(requestBody?.messages?.[0]).toEqual({ role: 'system', content: 'Override prompt.' });
    expect(json.answer).toBe('Use the override.');
    expect(json.citations).toHaveLength(1);
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

describe('heading id consistency', () => {
  it('keeps outline ids identical to rendered heading ids for code spans with angle brackets', async () => {
    const markdown = ['# Guide', '', '### `init <path>`', '', 'Body text.'].join('\n');
    const compiled = await compileMarkdown(markdown);
    const outline = extractMarkdownOutline(markdown);

    expect(compiled.html).toContain('<h3 id="init-path">');
    expect(compiled.headings.map((heading) => heading.id)).toContain('init-path');
    expect(outline.headings.map((heading) => heading.id)).toEqual(
      compiled.headings.map((heading) => heading.id)
    );
  });

  it('does not invent hyphens for adjacent inline formatting', async () => {
    const markdown = ['# Guide', '', '### Foo **bar** baz', '', 'Body text.'].join('\n');
    const compiled = await compileMarkdown(markdown);

    expect(compiled.html).toContain('<h3 id="foo-bar-baz">');
    expect(compiled.headings.map((heading) => heading.id)).toContain('foo-bar-baz');
  });

  it('strips inline HTML tags but keeps their text, like the rehype side', async () => {
    const markdown = ['# Guide', '', '### Set <span class="x">env</span> vars', '', 'Body text.'].join('\n');
    const compiled = await compileMarkdown(markdown);
    const outline = extractMarkdownOutline(markdown);

    expect(compiled.html).toContain('<h3 id="set-env-vars">');
    expect(outline.headings.map((heading) => heading.id)).toContain('set-env-vars');
  });

  it('gives search sections the same ids as the rendered headings', () => {
    const markdown = [
      '# Guide',
      '',
      '## `init <path>`',
      '',
      'First section body text.',
      '',
      '## Foo **bar**',
      '',
      'Second section body text.'
    ].join('\n');
    const sections = extractMarkdownSections(markdown);

    expect(sections.map((section) => section.id)).toEqual(['init-path', 'foo-bar']);
  });
});

describe('sidebar section ordering', () => {
  it('positions sections by their index page order, not by their earliest page', () => {
    const tree = createPageTree([
      createFixturePage({ id: 'a-index', title: 'A', routePath: '/docs/a', order: 2 }),
      createFixturePage({ id: 'a-one', title: 'A One', routePath: '/docs/a/one', order: 1 }),
      createFixturePage({ id: 'b-index', title: 'B', routePath: '/docs/b', order: 1 }),
      createFixturePage({ id: 'b-one', title: 'B One', routePath: '/docs/b/one', order: 9 })
    ]);

    // B (index order 1) precedes A (index order 2), even though A contains a page
    // ordered 1 — the section index order wins over the min-of-children weight.
    expect(tree.map((item) => item.title)).toEqual(['B', 'A']);
    // Within a section, pages still sort by their own order.
    expect(tree[1]!.children?.map((item) => item.title)).toEqual(['A One']);
  });

  it('falls back to the earliest page order for sections without an index order', () => {
    const tree = createPageTree([
      createFixturePage({ id: 'a-index', title: 'A', routePath: '/docs/a', order: 2 }),
      createFixturePage({ id: 'a-one', title: 'A One', routePath: '/docs/a/one', order: 1 }),
      createFixturePage({ id: 'c-one', title: 'C One', routePath: '/docs/c/one', order: 5 }),
      createFixturePage({ id: 'c-two', title: 'C Two', routePath: '/docs/c/two', order: 3 })
    ]);

    // C has no index page, so its weight is its earliest page (3) — after A (2).
    expect(tree.map((item) => item.title)).toEqual(['A', 'C']);
  });
});

function restoreGlobalProperty(name: 'window' | 'document' | 'localStorage', descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }
  Reflect.deleteProperty(globalThis, name);
}