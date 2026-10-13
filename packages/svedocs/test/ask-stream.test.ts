import { describe, expect, it, vi } from 'vitest';
import { consumeAskStream, readAskEvent } from '../src/theme/controllers/ask-stream.js';

describe('Cloudflare Ask AI stream citations', () => {
  it.each(['array', 'wrapped'])('reads %s chunk events and keeps token deltas', async (format) => {
    const chunks = [{ item: { metadata: { svedocs: JSON.stringify({ title: 'Configuration', url: '/docs/configuration', section: 'Theme' }) } } }];
    const handlers = { answer: vi.fn(), delta: vi.fn(), citations: vi.fn(), error: vi.fn() };
    const stream = `event: chunks\r\ndata: ${JSON.stringify(format === 'array' ? chunks : { chunks })}\r\n\r\n`
      + 'data: {"choices":[{"delta":{"content":"文档"}}]}\n\n'
      + 'data: [DONE]\n\n';
    const bytes = new TextEncoder().encode(stream);
    const response = new Response(new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      }
    }));
    await consumeAskStream(response, () => true, (block) => readAskEvent(block, (key) => key, handlers));
    expect(handlers.citations).toHaveBeenCalledWith([{ title: 'Configuration', url: '/docs/configuration', section: 'Theme' }]);
    expect(handlers.delta).toHaveBeenCalledWith('文档');
    expect(handlers.error).not.toHaveBeenCalled();
  });
});
