import type { SvedocsSearchRecord } from '../core.js';
import { filterSearchRecords } from '../search.js';
import type { SearchScope } from '../search.js';
import type { AiProvider, AskResult, ChatMessage, CreateAskResponseOptions } from './types.js';

const maxAskRequestBytes = 64 * 1024;

export async function createAskResponse(
  provider: AiProvider,
  request: Request,
  recordsOrOptions: SvedocsSearchRecord[] | CreateAskResponseOptions = []
): Promise<Response> {
  const options = Array.isArray(recordsOrOptions) ? { records: recordsOrOptions } : recordsOrOptions;
  const stream = options.stream ?? wantsStream(request);
  try {
    const rawBody = await readLimitedRequestText(request, maxAskRequestBytes);
    if (rawBody === undefined) {
      return askErrorResponse('Ask AI request is too large.', 413, stream);
    }
    let parsed: unknown;
    try {
      parsed = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return askErrorResponse('Invalid JSON request body.', 400, stream);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return askErrorResponse('Invalid Ask AI request.', 400, stream);
    }
    const body = parsed as {
      question?: string;
      messages?: ChatMessage[];
      locale?: string;
      kind?: string;
    } & Record<string, unknown>;
    if (body.question !== undefined && typeof body.question !== 'string') {
      return askErrorResponse('Question must be a string.', 400, stream);
    }
    if (body.question && body.question.length > 4_000) {
      return askErrorResponse('Question is too long.', 413, stream);
    }
    if (body.messages !== undefined && !Array.isArray(body.messages)) {
      return askErrorResponse('Messages must be an array.', 400, stream);
    }
    if (body.messages?.some((message) => !isValidMessage(message))) {
      return askErrorResponse('Messages contain an invalid entry.', 400, stream);
    }
    if (body.locale !== undefined && typeof body.locale !== 'string') {
      return askErrorResponse('Locale must be a string.', 400, stream);
    }
    if (body.kind !== undefined && typeof body.kind !== 'string') {
      return askErrorResponse('Kind must be a string.', 400, stream);
    }
    if (body.messages && body.messages.length > 30) {
      return askErrorResponse('Message history is too long.', 413, stream);
    }
    const messages = sanitizeMessages(body.messages);
    if (messages.some((message) => message.content.length > 8_000)
      || messages.reduce((total, message) => total + message.content.length, 0) > 32_000) {
      return askErrorResponse('Message history is too long.', 413, stream);
    }
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    const question = (body.question?.trim() ?? lastUserMessage?.content.trim() ?? '');
    if (!question) {
      return askErrorResponse('Question is required.', 400, stream);
    }
    if (options.rateLimiter) {
      const limit = await options.rateLimiter.check({
        key: createRateLimitKey(request, options.rateLimitKey),
        request
      });
      if (!limit.allowed) {
        return askErrorResponse('Ask AI rate limit exceeded.', 429, stream, limit.retryAfter);
      }
    }
    const scope = createRequestScope(request, body, options.scope);
    const records = filterSearchRecords(options.records ?? [], scope);
    const askInput = {
      question,
      records,
      scope,
      ...(messages.length > 0 ? { messages } : {}),
      ...(options.systemPrompt ? { systemPrompt: options.systemPrompt } : {}),
      ...(options.maxResults ? { maxResults: options.maxResults } : {}),
      signal: request.signal
    };
    if (stream && provider.stream) {
      return streamProviderResponse(await provider.stream(askInput));
    }
    const result = await provider.ask(askInput);
    return stream ? streamAskResult(result) : jsonResponse(result);
  } catch (error) {
    console.error('svedocs Ask AI provider failure', error);
    return askErrorResponse('Ask AI failed. Please try again later.', 500, stream);
  }
}

async function readLimitedRequestText(request: Request, maxBytes: number): Promise<string | undefined> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return undefined;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return undefined;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function isValidMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return false;
  const candidate = message as { role?: unknown; content?: unknown };
  return (candidate.role === 'user' || candidate.role === 'assistant')
    && typeof candidate.content === 'string';
}

function sanitizeMessages(messages: ChatMessage[] | undefined): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message): message is ChatMessage =>
      Boolean(message)
        && (message.role === 'user' || message.role === 'assistant')
        && typeof message.content === 'string'
        && message.content.trim().length > 0
    )
    .map((message) => ({ role: message.role, content: message.content }));
}

function createRequestScope(
  request: Request,
  body: SearchScope,
  configured: CreateAskResponseOptions['scope']
): SearchScope {
  const url = new URL(request.url);
  const base = typeof configured === 'function' ? configured(request) : configured;
  const locale = readScopeParam(url, 'locale');
  const kind = readScopeParam(url, 'kind');
  return cleanScope({
    ...(base ?? {}),
    ...(locale ? { locale } : {}),
    ...(kind ? { kind } : {}),
    ...(body.locale ? { locale: body.locale } : {}),
    ...(body.kind ? { kind: body.kind } : {})
  });
}

function cleanScope(scope: {
  locale?: string | undefined;
  kind?: string | undefined;
}): SearchScope {
  return {
    ...(scope.locale?.trim() ? { locale: scope.locale.trim() } : {}),
    ...(scope.kind?.trim() ? { kind: scope.kind.trim() } : {})
  };
}

function readScopeParam(url: URL, key: keyof SearchScope): string | undefined {
  return url.searchParams.get(key)?.trim() || undefined;
}

function wantsStream(request: Request): boolean {
  const url = new URL(request.url);
  return url.searchParams.get('stream') === '1' || request.headers.get('accept')?.includes('text/event-stream') === true;
}

function createRateLimitKey(request: Request, key: CreateAskResponseOptions['rateLimitKey']): string {
  if (typeof key === 'function') return key(request);
  if (typeof key === 'string') return key;
  return request.headers.get('cf-connecting-ip') ?? 'anonymous';
}

function streamProviderResponse(result: Response | ReadableStream<Uint8Array>): Response {
  if (result instanceof Response) {
    return new Response(result.body, {
      status: result.status,
      headers: {
        'content-type': result.headers.get('content-type') ?? 'text/event-stream; charset=utf-8',
        'cache-control': result.headers.get('cache-control') ?? 'no-cache, no-transform'
      }
    });
  }
  return new Response(result, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform'
    }
  });
}

function streamAskResult(result: AskResult): Response {
  return eventStreamResponse((send) => {
    send('answer', { answer: result.answer });
    send('citations', { citations: result.citations });
    send('done', {});
  });
}

function askErrorResponse(message: string, status: number, stream: boolean, retryAfter?: number): Response {
  if (stream) {
    return eventStreamResponse((send) => {
      send('error', { error: message, status, ...(retryAfter ? { retryAfter } : {}) });
      send('done', {});
    }, status, retryAfter);
  }
  return jsonResponse({
    error: message,
    ...(retryAfter ? { retryAfter } : {})
  }, status, retryAfter);
}

function eventStreamResponse(
  write: (send: (event: string, value: unknown) => void) => void,
  status = 200,
  retryAfter?: number
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, value: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`));
      };
      write(send);
      controller.close();
    }
  });
  return new Response(stream, {
    status,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      ...(retryAfter ? { 'retry-after': String(retryAfter) } : {})
    }
  });
}

function jsonResponse(value: unknown, status = 200, retryAfter?: number): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(retryAfter ? { 'retry-after': String(retryAfter) } : {})
    }
  });
}
