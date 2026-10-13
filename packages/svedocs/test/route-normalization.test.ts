import { describe, expect, it } from 'vitest';
import { normalizeRoutePath } from '../src/core/utils.js';

describe('route normalization fast path', () => {
  it.each([
    ['/', '/'], ['/docs/zh/configuration', '/docs/zh/configuration'],
    ['/文档/安装', '/文档/安装'], ['/docs/%2E%2E/start', '/docs/%2E%2E/start'],
    ['', '/'], ['docs/start', '/docs/start'], ['//docs///start/', '/docs/start'],
    ['/docs/./start', '/docs/start'], ['/docs/../start', '/start'],
    ['/../../start', '/start'], ['/docs/index.md', '/docs/index.md'],
    ['/docs/.hidden/...', '/docs/.hidden/...'], ['/docs?x=/wrong', '/docs'],
    ['/docs#section', '/docs'], [String.raw`\docs\start`, '/docs/start']
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeRoutePath(input)).toBe(expected);
  });
});
