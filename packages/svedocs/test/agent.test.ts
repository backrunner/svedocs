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
  createSvedocsAgentHandle,
  isAgentRequest,
  isAgentUserAgent,
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

  it('returns 404 for pages without markdown content', () => {
    const empty = [createFixturePage({ id: 'empty', routePath: '/docs/empty', markdown: '' })];
    expect(createPageMarkdownResponse(createConfig(), empty, undefined, '/docs/empty/index.md').status).toBe(404);
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

  it('excludes pages without markdown content so links never 404', () => {
    const output = createLlmsTxt(createConfig(), pages);
    expect(output).not.toContain('Empty');
    expect(createLlmsFullTxt(createConfig(), pages)).not.toContain('Empty');
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

describe('agent user agent detection', () => {
  it('matches known agents case-insensitively', () => {
    expect(isAgentUserAgent('Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://anthropic.com)')).toBe(true);
    expect(isAgentUserAgent('gptbot/1.2')).toBe(true);
    expect(isAgentUserAgent('Mozilla/5.0 (Macintosh) Chrome/126.0')).toBe(false);
    expect(isAgentUserAgent(null)).toBe(false);
  });

  it('supports custom user agent lists', () => {
    expect(isAgentUserAgent('MyBot/1.0', ['mybot'])).toBe(true);
    expect(isAgentUserAgent('ClaudeBot/1.0', ['mybot'])).toBe(false);
  });
});

describe('isAgentRequest', () => {
  it('matches agent user agents', () => {
    const config = createConfig();
    const request = new Request('https://docs.example.com/docs', { headers: { 'user-agent': 'ClaudeBot/1.0' } });
    expect(isAgentRequest(request, config.agent)).toBe(true);
  });

  it('honors Accept: text/markdown when preferred over html', () => {
    const config = createConfig();
    const markdownFirst = new Request('https://docs.example.com/docs', { headers: { accept: 'text/markdown' } });
    const markdownWeighted = new Request('https://docs.example.com/docs', { headers: { accept: 'text/html;q=0.5, text/markdown;q=0.9' } });
    const htmlOnly = new Request('https://docs.example.com/docs', { headers: { accept: 'text/html,application/xhtml+xml' } });
    expect(isAgentRequest(markdownFirst, config.agent)).toBe(true);
    expect(isAgentRequest(markdownWeighted, config.agent)).toBe(true);
    expect(isAgentRequest(htmlOnly, config.agent)).toBe(false);
  });

  it('ignores the Accept header when accept negotiation is disabled', () => {
    const config = createConfig({ negotiation: { accept: false } });
    const request = new Request('https://docs.example.com/docs', { headers: { accept: 'text/markdown' } });
    expect(isAgentRequest(request, config.agent)).toBe(false);
  });

  it('returns false when negotiation is disabled entirely', () => {
    const config = createConfig({ negotiation: false });
    const request = new Request('https://docs.example.com/docs', { headers: { 'user-agent': 'ClaudeBot/1.0' } });
    expect(isAgentRequest(request, config.agent)).toBe(false);
  });

  it('does not treat wildcard-only Accept headers as markdown preference', () => {
    const config = createConfig();
    const request = new Request('https://docs.example.com/docs', { headers: { accept: '*/*' } });
    expect(isAgentRequest(request, config.agent)).toBe(false);
  });
});

describe('createSvedocsAgentHandle', () => {
  const pages = [
    createFixturePage({ id: 'theme', routePath: '/docs/theme', title: 'Theme', markdown: 'Theme body.' })
  ];

  function createEvent(pathname: string, headers: Record<string, string>) {
    return {
      event: {
        request: new Request(`https://docs.example.com${pathname}`, { headers }),
        url: new URL(`https://docs.example.com${pathname}`)
      },
      resolve: () => new Response('<html>page</html>', { headers: { 'content-type': 'text/html' } })
    };
  }

  it('serves markdown to agent user agents on edge builds', async () => {
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const { event, resolve } = createEvent('/docs/theme', { 'user-agent': 'ClaudeBot/1.0' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('vary')).toContain('accept');
    expect(response.headers.get('vary')).toContain('user-agent');
    expect(await response.text()).toContain('Theme body.');
  });

  it('serves markdown when Accept prefers markdown', async () => {
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const { event, resolve } = createEvent('/docs/theme', { accept: 'text/markdown' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
  });

  it('passes browser requests through with Vary headers for cache safety', async () => {
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const { event, resolve } = createEvent('/docs/theme', { 'user-agent': 'Mozilla/5.0 Chrome/126.0', accept: 'text/html' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(response.headers.get('vary')).toContain('accept');
    expect(response.headers.get('vary')).toContain('user-agent');
  });

  it('negotiates percent-encoded pathnames', async () => {
    const encodedPages = [createFixturePage({ id: 'zh-page', routePath: '/docs/主题', title: '主题', markdown: '正文。' })];
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages: encodedPages });
    const { event, resolve } = createEvent('/docs/%E4%B8%BB%E9%A2%98', { 'user-agent': 'ClaudeBot/1.0' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await response.text()).toContain('正文。');
  });

  it('passes through for unknown paths even from agents', async () => {
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const { event, resolve } = createEvent('/docs/nope', { 'user-agent': 'GPTBot/1.0' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/html');
  });

  it('does not negotiate on static builds', async () => {
    const config = resolveSvedocsConfig({ site: { name: 'svedocs', url: siteUrl }, build: { mode: 'static' } });
    const handle = createSvedocsAgentHandle({ config, pages });
    const { event, resolve } = createEvent('/docs/theme', { 'user-agent': 'ClaudeBot/1.0' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/html');
  });
});

describe('createSvedocsAgentHandle Cloudflare cache', () => {
  const pages = [
    createFixturePage({ id: 'theme', routePath: '/docs/theme', title: 'Theme', markdown: 'Theme body.' })
  ];

  function createFakeCache() {
    const store = new Map<string, Response>();
    const calls = { match: 0, put: 0 };
    return {
      store,
      calls,
      cache: {
        async match(request: Request) {
          calls.match += 1;
          return store.get(request.url);
        },
        async put(request: Request, response: Response) {
          calls.put += 1;
          store.set(request.url, response);
        }
      }
    };
  }

  function createCacheEvent(cache: unknown, waitUntil?: (promise: Promise<unknown>) => void) {
    return {
      event: {
        request: new Request('https://docs.example.com/docs/theme', { headers: { 'user-agent': 'ClaudeBot/1.0' } }),
        url: new URL('https://docs.example.com/docs/theme'),
        platform: {
          caches: { default: cache },
          ...(waitUntil ? { context: { waitUntil } } : {})
        }
      },
      resolve: () => new Response('<html>page</html>', { headers: { 'content-type': 'text/html' } })
    };
  }

  it('caches negotiated markdown in the Cloudflare cache and serves later hits from it', async () => {
    const { cache, calls, store } = createFakeCache();
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const first = createCacheEvent(cache);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstResponse = await handle(first as any);
    expect(firstResponse.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    // Outgoing responses must stay private so shared edge caches never serve
    // markdown to browsers under the page URL; the TTL lives on the stored entry.
    expect(firstResponse.headers.get('cache-control')).toContain('private');
    expect(calls.match).toBe(1);
    expect(calls.put).toBe(1);
    const [storedKey, storedResponse] = [...store.entries()][0] ?? [];
    expect(storedKey).toContain('__svedocs_agent_md=');
    expect(storedResponse?.headers.get('cache-control')).toContain('max-age=3600');

    const second = createCacheEvent(cache);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const secondResponse = await handle(second as any);
    expect(calls.match).toBe(2);
    expect(calls.put).toBe(1);
    expect(secondResponse.headers.get('cache-control')).toContain('private');
    expect(secondResponse.headers.get('vary')).toContain('user-agent');
    expect(await secondResponse.text()).toContain('Theme body.');
  });

  it('defers the cache write to waitUntil when the platform provides it', async () => {
    const { cache, calls } = createFakeCache();
    const pending: Promise<unknown>[] = [];
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const { event, resolve } = createCacheEvent(cache, (promise) => pending.push(promise));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.status).toBe(200);
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
    expect(calls.put).toBe(1);
  });

  it('does not touch the cache when caching is disabled', async () => {
    const { cache, calls } = createFakeCache();
    const config = createConfig({ negotiation: { cache: false } });
    const handle = createSvedocsAgentHandle({ config, pages });
    const { event, resolve } = createCacheEvent(cache);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(calls.match).toBe(0);
    expect(calls.put).toBe(0);
  });

  it('does not cache browser pass-through responses', async () => {
    const { cache, calls } = createFakeCache();
    const handle = createSvedocsAgentHandle({ config: createConfig(), pages });
    const event = {
      request: new Request('https://docs.example.com/docs/theme', { headers: { 'user-agent': 'Mozilla/5.0 Chrome/126.0', accept: 'text/html' } }),
      url: new URL('https://docs.example.com/docs/theme'),
      platform: { caches: { default: cache } }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handle({ event, resolve: () => new Response('<html/>') } as any);
    expect(calls.match).toBe(0);
    expect(calls.put).toBe(0);
  });

  it('versions cache keys by content so deploys invalidate automatically', async () => {
    const { cache, store } = createFakeCache();
    const v1 = createSvedocsAgentHandle({ config: createConfig(), pages });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await v1(createCacheEvent(cache) as any);
    const v2Pages = [createFixturePage({ id: 'theme', routePath: '/docs/theme', title: 'Theme', markdown: 'Updated body.' })];
    const v2 = createSvedocsAgentHandle({ config: createConfig(), pages: v2Pages });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await v2(createCacheEvent(cache) as any);
    expect(store.size).toBe(2);
    expect(new Set([...store.keys()]).size).toBe(2);
    expect(await response.text()).toContain('Updated body.');
  });
});
