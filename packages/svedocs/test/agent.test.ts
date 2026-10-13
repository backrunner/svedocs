import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_USER_AGENTS,
  createLlmsFullTxt,
  createLlmsFullTxtResponse,
  createLlmsTxt,
  createLlmsTxtResponse,
  createPageMarkdown,
  createPageMarkdownEntries,
  createPageMarkdownPath,
  createPageMarkdownResponse,
  parseMarkdownPathname
} from '../src/agent.js';
import { resolveSvedocsConfig } from '../src/core.js';
import type { SvedocsConfig } from '../src/config.js';
import { createFixturePage } from '../src/testing.js';

const siteUrl = 'https://docs.example.com';

function createConfig(agent?: SvedocsConfig['agent']) {
  return resolveSvedocsConfig({ site: { name: 'svedocs', url: siteUrl }, ...(agent !== undefined ? { agent } : {}) });
}

describe('agent config resolution', () => {
  it('enables the agent interface by default', () => {
    const config = createConfig();
    expect(config.agent.enabled).toBe(true);
    expect(config.agent.markdown).toBe(true);
    expect(config.agent.llms).toBe(true);
    expect(config.agent.negotiation.enabled).toBe(true);
    expect(config.agent.negotiation.accept).toBe(true);
    expect(config.agent.negotiation.userAgents).toEqual(DEFAULT_AGENT_USER_AGENTS);
  });

  it('disables everything with agent: false', () => {
    const config = createConfig(false);
    expect(config.agent.enabled).toBe(false);
    expect(config.agent.markdown).toBe(false);
    expect(config.agent.llms).toBe(false);
    expect(config.agent.negotiation.enabled).toBe(false);
  });

  it('supports fine-grained negotiation options', () => {
    const config = createConfig({ negotiation: { userAgents: ['MyBot'], accept: false } });
    expect(config.agent.negotiation.enabled).toBe(true);
    expect(config.agent.negotiation.userAgents).toEqual(['MyBot']);
    expect(config.agent.negotiation.accept).toBe(false);
  });

  it('supports negotiation: false', () => {
    const config = createConfig({ negotiation: false });
    expect(config.agent.enabled).toBe(true);
    expect(config.agent.negotiation.enabled).toBe(false);
  });

  it('resolves agent: { enabled: false } as disabled', () => {
    const config = createConfig({ enabled: false });
    expect(config.agent.enabled).toBe(false);
    expect(config.agent.negotiation.enabled).toBe(false);
  });

  it('does not share the default user agent array between resolutions', () => {
    const first = createConfig();
    first.agent.negotiation.userAgents.push('Polluted');
    expect(createConfig().agent.negotiation.userAgents).not.toContain('Polluted');
  });

  it('resolves cache defaults and overrides', () => {
    expect(createConfig().agent.negotiation.cache).toEqual({ enabled: true, maxAge: 3600 });
    expect(createConfig({ negotiation: { cache: false } }).agent.negotiation.cache).toEqual({ enabled: false, maxAge: 3600 });
    expect(createConfig({ negotiation: { cache: { maxAge: 60 } } }).agent.negotiation.cache).toEqual({ enabled: true, maxAge: 60 });
    expect(createConfig(false).agent.negotiation.cache).toEqual({ enabled: true, maxAge: 3600 });
  });
});

describe('createPageMarkdownPath', () => {
  it('maps the root page to /index.md', () => {
    expect(createPageMarkdownPath(createFixturePage({ routePath: '/' }))).toBe('/index.md');
  });

  it('maps nested pages to <route>/index.md', () => {
    expect(createPageMarkdownPath(createFixturePage({ routePath: '/docs/configuration/theme' }))).toBe('/docs/configuration/theme/index.md');
    expect(createPageMarkdownPath(createFixturePage({ routePath: '/docs/configuration/theme/' }))).toBe('/docs/configuration/theme/index.md');
  });
});

describe('parseMarkdownPathname', () => {
  it('parses twin paths back to route paths', () => {
    expect(parseMarkdownPathname('/index.md')).toBe('/');
    expect(parseMarkdownPathname('/docs/configuration/theme/index.md')).toBe('/docs/configuration/theme');
    expect(parseMarkdownPathname('/docs/configuration/theme')).toBeUndefined();
    expect(parseMarkdownPathname('/llms.txt')).toBeUndefined();
  });
});

describe('createPageMarkdown', () => {
  it('renders frontmatter, index pointer, title, body, and source', () => {
    const config = createConfig();
    const page = createFixturePage({
      routePath: '/docs/installation',
      title: 'Installation',
      description: 'Install svedocs.',
      markdown: 'Run the create command.\n\n```sh\npnpm create svedocs\n```'
    });
    const output = createPageMarkdown(config, page);
    expect(output).toContain('---\ntitle: "Installation"\ndescription: "Install svedocs."\n---');
    expect(output).toContain(`> Fetch the complete documentation index at: ${siteUrl}/llms.txt`);
    expect(output).toContain('# Installation\n');
    expect(output).toContain('Run the create command.');
    expect(output).toContain('```sh\npnpm create svedocs\n```');
    expect(output.trimEnd().endsWith(`Source: ${siteUrl}/docs/installation`)).toBe(true);
  });

  it('omits the documentation index pointer when llms is disabled', () => {
    const config = createConfig({ llms: false });
    const page = createFixturePage({ markdown: 'Body.' });
    expect(createPageMarkdown(config, page)).not.toContain('Documentation Index');
  });

  it('sanitizes titles that contain markdown control characters', () => {
    const config = createConfig();
    const page = createFixturePage({ title: 'Using [brackets]\nand lines', markdown: 'Body.' });
    const output = createPageMarkdown(config, page);
    expect(output).toContain('# Using \\[brackets\\] and lines');
  });
});

describe('createPageMarkdownResponse', () => {
  const pages = [
    createFixturePage({ id: 'root', routePath: '/', markdown: 'Welcome.' }),
    createFixturePage({ id: 'theme', routePath: '/docs/configuration/theme', title: 'Theme', markdown: 'Theme body.' }),
    createFixturePage({ id: 'hidden', routePath: '/docs/hidden', hidden: true, markdown: 'Hidden body.' })
  ];

  it('serves markdown for an existing page', async () => {
    const response = createPageMarkdownResponse(createConfig(), pages, undefined, '/docs/configuration/theme/index.md');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await response.text()).toContain('Theme body.');
  });

  it('serves the root page twin', async () => {
    const response = createPageMarkdownResponse(createConfig(), pages, undefined, '/index.md');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Welcome.');
  });

  it('prefers the markdown map over page.markdown', async () => {
    const response = createPageMarkdownResponse(createConfig(), pages, { theme: 'From the map.' }, '/docs/configuration/theme/index.md');
    expect(await response.text()).toContain('From the map.');
  });

  it('returns 404 for unknown or hidden pages', () => {
    expect(createPageMarkdownResponse(createConfig(), pages, undefined, '/docs/nope/index.md').status).toBe(404);
    expect(createPageMarkdownResponse(createConfig(), pages, undefined, '/docs/hidden/index.md').status).toBe(404);
  });

  it('serves title-only pages with empty markdown content', () => {
    const empty = [createFixturePage({ id: 'empty', routePath: '/docs/empty', markdown: '' })];
    expect(createPageMarkdownResponse(createConfig(), empty, undefined, '/docs/empty/index.md').status).toBe(200);
  });

  it('redirects untranslated locale twins to the default locale twin', () => {
    const config = resolveSvedocsConfig({
      site: { name: 'svedocs', url: siteUrl },
      i18n: { defaultLocale: 'en', locales: ['en', 'zh'] }
    });
    const localized = [createFixturePage({ id: 'en', routePath: '/docs/theme', locale: 'en', scopePath: '/docs/theme', markdown: 'Body.' })];
    const response = createPageMarkdownResponse(config, localized, undefined, '/docs/zh/theme/index.md');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/docs/theme/index.md');
  });

  it('returns a disabled response when agent markdown is off', () => {
    const response = createPageMarkdownResponse(createConfig(false), pages, undefined, '/index.md');
    expect(response.status).toBe(404);
  });
});

describe('createPageMarkdownEntries', () => {
  it('lists twin paths for discoverable pages only', () => {
    const pages = [
      createFixturePage({ id: 'root', routePath: '/', markdown: 'Welcome.' }),
      createFixturePage({ id: 'theme', routePath: '/docs/theme', markdown: 'Body.' }),
      createFixturePage({ id: 'hidden', routePath: '/docs/hidden', hidden: true, markdown: 'Body.' })
    ];
    expect(createPageMarkdownEntries(createConfig(), pages)).toEqual([{ path: 'docs/theme' }]);
    expect(createPageMarkdownEntries(createConfig(false), pages)).toEqual([]);
  });
});

describe('llms.txt', () => {
  const pages = [
    createFixturePage({ id: 'root', routePath: '/', title: 'Home', description: 'Start here.', markdown: 'Welcome.' }),
    createFixturePage({ id: 'theme', routePath: '/docs/theme', title: 'Theme', description: 'Theme the docs.', markdown: 'Body.' }),
    createFixturePage({ id: 'hidden', routePath: '/docs/hidden', title: 'Hidden', hidden: true, markdown: 'Body.' }),
    createFixturePage({ id: 'empty', routePath: '/docs/empty', title: 'Empty', markdown: '' }),
    createFixturePage({ id: 'noindex', routePath: '/docs/noindex', title: 'Noindex', seo: { title: 'Noindex', robots: 'noindex' }, markdown: 'Body.' })
  ];

  it('lists discoverable pages with twin links and descriptions', () => {
    const output = createLlmsTxt(createConfig(), pages);
    expect(output).toContain('# svedocs');
    expect(output).toContain(`Full corpus (all pages, one document): ${siteUrl}/llms-full.txt`);
    expect(output).toContain(`- [Home](${siteUrl}/index.md) — Start here.`);
    expect(output).toContain(`- [Theme](${siteUrl}/docs/theme/index.md) — Theme the docs.`);
    expect(output).not.toContain('Hidden');
    expect(output).not.toContain('Noindex');
  });

  it('includes title-only pages in discovery', () => {
    const output = createLlmsTxt(createConfig(), pages);
    expect(output).toContain('Empty');
    expect(createLlmsFullTxt(createConfig(), pages)).toContain('Empty');
  });

  it('returns a disabled response when markdown twins are off', () => {
    const config = createConfig({ markdown: false });
    expect(createLlmsTxtResponse(config, pages, undefined).status).toBe(404);
    expect(createLlmsFullTxtResponse(config, pages, undefined).status).toBe(404);
  });

  it('sanitizes titles and descriptions in the index', () => {
    const nasty = [createFixturePage({ id: 'nasty', routePath: '/docs/nasty', title: 'A [linked]\ntitle', description: 'Line one\nLine two', markdown: 'Body.' })];
    const output = createLlmsTxt(createConfig(), nasty);
    expect(output).toContain('- [A \\[linked\\] title]');
    expect(output).toContain('— Line one Line two');
  });

  it('excludes non-default locales from the index', () => {
    const config = resolveSvedocsConfig({
      site: { name: 'svedocs', url: siteUrl },
      i18n: { defaultLocale: 'en', locales: ['en', 'zh'] }
    });
    const localized = [
      createFixturePage({ id: 'en', routePath: '/docs/theme', locale: 'en', title: 'Theme', markdown: 'Body.' }),
      createFixturePage({ id: 'zh', routePath: '/docs/zh/theme', locale: 'zh', title: '主题', markdown: '正文。' })
    ];
    const output = createLlmsTxt(config, localized);
    expect(output).toContain('[Theme]');
    expect(output).not.toContain('主题');
  });

  it('inlines page bodies in llms-full.txt', () => {
    const output = createLlmsFullTxt(createConfig(), pages);
    expect(output).toContain(`Index: ${siteUrl}/llms.txt`);
    expect(output).toContain('# Theme');
    expect(output).toContain(`Source: ${siteUrl}/docs/theme · Markdown: ${siteUrl}/docs/theme/index.md`);
    expect(output).toContain('Body.');
    expect(output).not.toContain('Hidden');
  });
});
