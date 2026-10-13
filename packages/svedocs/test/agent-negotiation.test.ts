import { describe, expect, it } from 'vitest';
import { createSvedocsAgentHandle, isAgentRequest, isAgentUserAgent } from '../src/agent.js';
import { resolveSvedocsConfig } from '../src/core.js';
import type { SvedocsConfig } from '../src/config.js';
import { createFixturePage } from '../src/testing.js';

function createConfig(agent?: SvedocsConfig['agent']) {
  return resolveSvedocsConfig({ site: { name: 'svedocs', url: 'https://docs.example.com' }, ...(agent !== undefined ? { agent } : {}) });
}

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
    const config = resolveSvedocsConfig({ site: { name: 'svedocs', url: 'https://docs.example.com' }, build: { mode: 'static' } });
    const handle = createSvedocsAgentHandle({ config, pages });
    const { event, resolve } = createEvent('/docs/theme', { 'user-agent': 'ClaudeBot/1.0' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await handle({ event, resolve } as any);
    expect(response.headers.get('content-type')).toBe('text/html');
  });
});
