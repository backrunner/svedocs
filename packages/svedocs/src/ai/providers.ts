import type { SvedocsSearchRecord } from '../core.js';
import { createCloudflareAiSearchScopeFilters, normalizeCloudflareAiSearchResults } from '../search/cloudflare.js';
import { matchesSearchScope, searchRecords } from '../search.js';
import type { CloudflareAiSearchChatOutput, CloudflareAiSearchInput } from '../search.js';
import type {
  AiProvider,
  AiSearchBinding,
  AskCitation,
  AskInput,
  CloudflareAiChatInstance,
  CloudflareWorkersAiBinding
} from './types.js';

export function createMockAiProvider(): AiProvider {
  return {
    name: 'mock',
    ask(input) {
      const citations = rankAskCitations(input.records ?? [], input.question, 3);
      return {
        answer: citations.length > 0
          ? `I found ${citations.length} relevant source${citations.length === 1 ? '' : 's'} in this documentation. Connect Cloudflare AI Search to generate a hosted answer.`
          : `Ask AI is configured. Connect Cloudflare AI Search to answer: ${input.question}`,
        citations
      };
    }
  };
}

export function createCloudflareAiSearchAiProvider(input: {
  binding: AiSearchBinding;
  instanceName?: string;
  systemPrompt?: string;
  model?: string;
  maxResults?: number;
}): AiProvider {
  const maxResults = input.maxResults ?? 5;
  const systemPrompt = input.systemPrompt ?? 'Answer from the documentation. Cite the pages you used.';

  async function ask(question: AskInput) {
    const conversation = buildChatMessages(systemPrompt, question);
    const instance = resolveAiChatInstance(input.binding, input.instanceName);
    if (!instance.chatCompletions) {
      const result = await instance.search({
        messages: conversation,
        ai_search_options: {
          retrieval: createCloudflareAiSearchRetrieval(maxResults, question.scope)
        }
      });
      return {
        answer: result.response ?? result.answer ?? 'No answer was returned.',
        citations: createCloudflareAiSearchCitations(result, question, maxResults)
      };
    }
    const result = await instance.chatCompletions({
      messages: conversation,
      ...(input.model ? { model: input.model } : {}),
      ai_search_options: {
        retrieval: createCloudflareAiSearchRetrieval(maxResults, question.scope)
      }
    }) as CloudflareAiSearchChatOutput;
    return {
      answer: readAiSearchAnswer(result),
      citations: readCloudflareAiSearchCitations(result, question, maxResults)
    };
  }

  return {
    name: 'cloudflare-ai-search',
    ask,
    async stream(question) {
      const instance = resolveAiChatInstance(input.binding, input.instanceName);
      if (!instance.chatCompletions) {
        return createSvedocsAnswerStream(await ask(question));
      }
      const result = await instance.chatCompletions({
        messages: buildChatMessages(systemPrompt, question),
        ...(input.model ? { model: input.model } : {}),
        stream: true,
        ai_search_options: {
          retrieval: createCloudflareAiSearchRetrieval(maxResults, question.scope)
        }
      });
      if (result instanceof Response || result instanceof ReadableStream) return result;
      return createSvedocsAnswerStream({
        answer: readAiSearchAnswer(result),
        citations: readCloudflareAiSearchCitations(result, question, maxResults)
      });
    }
  };
}

export function createWorkersAiProvider(input: {
  ai: CloudflareWorkersAiBinding;
  model?: string;
  systemPrompt?: string;
  citationLimit?: number;
}): AiProvider {
  const systemPrompt = input.systemPrompt ?? 'Answer from the documentation context. Keep answers concise and cite relevant pages.';
  return {
    name: 'cloudflare-workers-ai',
    async ask(question) {
      const citations = rankAskCitations(question.records ?? [], question.question, input.citationLimit ?? 5);
      const context = citations.map((citation) => `- ${citation.section ?? citation.title}: ${citation.url}`).join('\n');
      const history = (question.messages ?? []).map((message) => ({ role: message.role, content: message.content }));
      const userContent = [
        `Question: ${question.question}`,
        '',
        'Sources:',
        context || 'No local source matched.'
      ].join('\n');
      const result = await input.ai.run(input.model ?? '@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userContent }
        ]
      });
      return {
        answer: readWorkersAiAnswer(result),
        citations
      };
    }
  };
}

export function rankAskCitations(
  records: SvedocsSearchRecord[],
  question: string,
  limit = 3
): AskCitation[] {
  return searchRecords(records, { query: question, limit }).map((result) => ({
    title: result.title,
    url: result.url,
    ...(result.section ? { section: result.section } : {})
  }));
}

export const mockAiProvider = createMockAiProvider();

function createSvedocsAnswerStream(result: { answer: string; citations: AskCitation[] }): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: answer\ndata: ${JSON.stringify({ answer: result.answer })}\n\n`));
      controller.enqueue(encoder.encode(`event: citations\ndata: ${JSON.stringify({ citations: result.citations })}\n\n`));
      controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      controller.close();
    }
  });
}

function resolveAiChatInstance(
  binding: AiSearchBinding,
  instanceName = 'svedocs'
): CloudflareAiChatInstance {
  return ('get' in binding ? binding.get(instanceName) : binding) as CloudflareAiChatInstance;
}

function normalizeCitations(citations: Array<{ title?: string; url?: string; section?: string }> | undefined): AskCitation[] {
  return (citations ?? []).map((citation) => ({
    title: citation.title ?? 'Source',
    url: citation.url ?? '#',
    ...(citation.section ? { section: citation.section } : {})
  }));
}

function createCloudflareAiSearchRetrieval(
  maxResults: number,
  scope: AskInput['scope']
): NonNullable<NonNullable<CloudflareAiSearchInput['ai_search_options']>['retrieval']> {
  const filters = createCloudflareAiSearchScopeFilters(scope);
  return {
    retrieval_type: 'hybrid',
    max_num_results: maxResults,
    ...(filters ? { filters } : {})
  };
}

function readCloudflareAiSearchCitations(
  result: CloudflareAiSearchChatOutput,
  input: AskInput,
  maxResults: number
): AskCitation[] {
  const scopedCitations = createCloudflareAiSearchCitations(result, input, maxResults);
  const citations = normalizeCitations(result.citations);
  if (hasSearchScope(input.scope)) {
    return scopedCitations.length > 0 ? scopedCitations : citations.slice(0, maxResults);
  }
  return citations.length > 0 ? citations.slice(0, maxResults) : scopedCitations;
}

function createCloudflareAiSearchCitations(
  result: CloudflareAiSearchChatOutput,
  input: AskInput,
  maxResults: number
): AskCitation[] {
  return normalizeCloudflareAiSearchResults(result, input.question)
    .filter((searchResult) => matchesSearchScope({ metadata: searchResult.metadata } as SvedocsSearchRecord, input.scope))
    .slice(0, maxResults)
    .map((searchResult) => ({
      title: searchResult.title,
      url: searchResult.url,
      ...(searchResult.section ? { section: searchResult.section } : {})
    }));
}

function hasSearchScope(scope: AskInput['scope']): boolean {
  return Boolean(scope?.locale || scope?.kind);
}

function readAiSearchAnswer(result: CloudflareAiSearchChatOutput): string {
  return (
    result.response ??
    result.answer ??
    result.choices?.[0]?.message?.content ??
    result.choices?.[0]?.text ??
    'No answer was returned.'
  );
}

function readWorkersAiAnswer(result: Awaited<ReturnType<CloudflareWorkersAiBinding['run']>>): string {
  if (typeof result === 'string') return result;
  return result.response ?? result.answer ?? result.result ?? 'No answer was returned.';
}

function buildChatMessages(
  systemPrompt: string,
  input: AskInput
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const history = (input.messages ?? []).map((message) => ({ role: message.role, content: message.content }));
  const lastIsCurrentQuestion =
    history.length > 0 &&
    history[history.length - 1]?.role === 'user' &&
    history[history.length - 1]?.content === input.question;
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history
  ];
  if (!lastIsCurrentQuestion) {
    messages.push({ role: 'user', content: input.question });
  }
  return messages;
}
