import type { SvedocsTranslate } from '../../core/types.js';
import type { SvedocsAskAiCitation } from '../types.js';
import { sanitizeNavigationUrl } from '../../search/utils.js';

interface StreamHandlers {
  answer(content: string): void;
  delta(content: string): void;
  citations(citations: SvedocsAskAiCitation[]): void;
  error(message: string): void;
}

export async function consumeAskStream(response: Response, isCurrent: () => boolean, onEvent: (block: string) => void): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!isCurrent()) {
      await reader.cancel();
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    let boundary = findAskEventBoundary(buffer);
    while (boundary) {
      onEvent(buffer.slice(0, boundary.index));
      buffer = buffer.slice(boundary.index + boundary.length);
      boundary = findAskEventBoundary(buffer);
    }
  }
  buffer += decoder.decode();
  if (isCurrent() && buffer.trim()) onEvent(buffer);
}

function findAskEventBoundary(value: string): { index: number; length: number } | undefined {
  const match = /\r\n\r\n|\n\n|\r\r/.exec(value);
  return match ? { index: match.index, length: match[0].length } : undefined;
}

export function readAskEvent(block: string, t: SvedocsTranslate, handlers: StreamHandlers): void {
  const normalized = block.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const event = /^event:\s*(.+)$/m.exec(normalized)?.[1] ?? 'message';
  const data = normalized.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
  if (!data || data === '[DONE]') return;
  try {
    const payload = JSON.parse(data) as {
      answer?: string;
      delta?: string;
      content?: string;
      citations?: SvedocsAskAiCitation[];
      chunks?: Array<{ title?: string; url?: string; metadata?: Record<string, unknown>; item?: { title?: string; metadata?: Record<string, unknown> } }>;
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string }; text?: string }>;
      error?: string;
    };
    if (event === 'answer') handlers.answer(payload.answer ?? '');
    if (event === 'delta') handlers.delta(payload.delta ?? payload.content ?? '');
    if (event === 'message') {
      handlers.delta(
        payload.choices?.[0]?.delta?.content
          ?? payload.choices?.[0]?.message?.content
          ?? payload.choices?.[0]?.text
          ?? payload.content
          ?? ''
      );
    }
    if (event === 'chunks') handlers.citations(normalizeChunkCitations(payload.chunks ?? [], t));
    if (event === 'citations') handlers.citations(payload.citations ?? []);
    if (event === 'error') handlers.error(payload.error ?? t('ask.failed'));
  } catch {
    handlers.error(t('ask.streamUnreadable'));
  }
}

function normalizeChunkCitations(chunks: Array<{ title?: string; url?: string; metadata?: Record<string, unknown>; item?: { title?: string; metadata?: Record<string, unknown> } }>, t: SvedocsTranslate): SvedocsAskAiCitation[] {
  return chunks.slice(0, 5).map((chunk, index) => {
    const metadata = normalizeSvedocsMetadata({ ...(chunk.item?.metadata ?? {}), ...(chunk.metadata ?? {}) });
    const section = stringValue(metadata.section);
    return {
      title: stringValue(chunk.title) ?? stringValue(chunk.item?.title) ?? stringValue(metadata.title) ?? t('ask.sourceTitle', { index: index + 1 }),
      url: sanitizeNavigationUrl(stringValue(chunk.url) ?? stringValue(metadata.url) ?? stringValue(metadata.source_url) ?? '#'),
      ...(section ? { section } : {})
    };
  });
}

function normalizeSvedocsMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const embedded = stringValue(metadata.svedocs);
  if (!embedded) return metadata;
  try {
    const parsed = JSON.parse(embedded) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return metadata;
    return { ...metadata, ...parsed };
  } catch {
    return metadata;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
