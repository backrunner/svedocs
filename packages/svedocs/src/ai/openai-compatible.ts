import { filterSearchRecords, searchRecords } from '../search.js';
import type { SearchResult } from '../search.js';
import type { AiProvider, AskInput } from './types.js';

export interface OpenAiCompatibleProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemPrompt?: string;
  citationLimit?: number;
  temperature?: number;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

interface ChatCompletionResponse {
  choices?: Array<{
    text?: string;
    message?: {
      content?: string;
    };
  }>;
  output_text?: string;
}

export function createOpenAiCompatibleProvider(options: OpenAiCompatibleProviderOptions): AiProvider {
  const citationLimit = options.citationLimit ?? 5;
  const systemPrompt = options.systemPrompt ?? [
    'Answer from the documentation sources provided by svedocs.',
    'Cite relevant pages by title and URL.',
    'If the sources are insufficient, say what is missing.'
  ].join(' ');
  return {
    name: 'openai-compatible',
    async ask(input) {
      const ranked = createOpenAiContextRecords(input, citationLimit);
      const citations = ranked.map((result) => ({
        title: result.title,
        url: result.url,
        ...(result.section ? { section: result.section } : {})
      }));
      const response = await (options.fetch ?? fetch)(createChatCompletionsEndpoint(options.baseUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.apiKey}`,
          ...(options.headers ?? {})
        },
        body: JSON.stringify({
          model: options.model,
          ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: createPrompt(input, ranked)
            }
          ]
        })
      });
      if (!response.ok) {
        throw new Error(`OpenAI-compatible provider returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
      }
      const payload = await response.json() as ChatCompletionResponse;
      return {
        answer: readChatCompletionAnswer(payload),
        citations
      };
    }
  };
}

function createOpenAiContextRecords(input: AskInput, citationLimit: number): SearchResult[] {
  const ranked = searchRecords(input.records ?? [], {
        query: input.question,
        limit: citationLimit,
        ...(input.scope ?? {})
      });
  if (ranked.length > 0) return ranked;
  return filterSearchRecords(input.records ?? [], input.scope).slice(0, citationLimit).map((record, index) => ({
    id: record.id,
    title: record.title,
    url: record.url,
    ...(record.section ? { section: record.section } : {}),
    excerpt: record.content.slice(0, 220),
    score: 1 / (index + 1),
    metadata: record.metadata
  }));
}

function createChatCompletionsEndpoint(baseUrl = 'https://api.openai.com/v1'): string {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`;
}

function createPrompt(input: AskInput, sources: SearchResult[]): string {
  const context = sources.length > 0
    ? sources.map((source, index) => [
        `[${index + 1}] ${source.section ? `${source.title}: ${source.section}` : source.title}`,
        `URL: ${source.url}`,
        source.excerpt
      ].join('\n')).join('\n\n')
    : 'No local documentation source matched.';
  return [
    `Question: ${input.question}`,
    '',
    'Sources:',
    context
  ].join('\n');
}

function readChatCompletionAnswer(payload: ChatCompletionResponse): string {
  return payload.output_text
    ?? payload.choices?.[0]?.message?.content
    ?? payload.choices?.[0]?.text
    ?? 'No answer was returned.';
}
