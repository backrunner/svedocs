import type { SvedocsSearchRecord } from '../core.js';
import { filterSearchRecords } from '../search.js';
import type { SearchScope } from '../search.js';
import type { AiProvider, AskResult, ChatMessage, CreateAskResponseOptions } from './types.js';

export async function createAskResponse(
  provider: AiProvider,
  request: Request,
  recordsOrOptions: SvedocsSearchRecord[] | CreateAskResponseOptions = []
): Promise<Response> {
  const options = Array.isArray(recordsOrOptions) ? { records: recordsOrOptions } : recordsOrOptions;
  const stream = options.stream ?? wantsStream(request);
  try {
    const body = await request.json().catch(() => ({})) as {
      question?: string;
      messages?: ChatMessage[];
      locale?: string;
      version?: string;
      kind?: string;
    };
    const messages = sanitizeMessages(body.messages);
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
      ...(options.maxResults ? { maxResults: options.maxResults } : {})
    };
    if (stream && provider.stream) {
      return streamProviderResponse(await provider.stream(askInput));
    }
    const result = await provider.ask(askInput);
    return stream ? streamAskResult(result) : jsonResponse(result);
  } catch (error) {
    return askErrorResponse(error instanceof Error ? error.message : 'Ask AI failed.', 500, stream);
  }
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
  const version = readScopeParam(url, 'version');
  const kind = readScopeParam(url, 'kind');
  return cleanScope({
    ...(base ?? {}),
    ...(locale ? { locale } : {}),
    ...(version ? { version } : {}),
    ...(kind ? { kind } : {}),
    ...(body.locale ? { locale: body.locale } : {}),
    ...(body.version ? { version: body.version } : {}),
    ...(body.kind ? { kind: body.kind } : {})
  });
}

function cleanScope(scope: {
  locale?: string | undefined;
  version?: string | undefined;
  kind?: string | undefined;
}): SearchScope {
  return {
    ...(scope.locale?.trim() ? { locale: scope.locale.trim() } : {}),
    ...(scope.version?.trim() ? { version: scope.version.trim() } : {}),
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
  return request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'anonymous';
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
