import { searchRecords } from '../search/local.js';
import type { SearchResult } from '../search/types.js';
import type { AskInput } from './types.js';

export function retrieveContext(input: AskInput, limit: number): SearchResult[] {
  const records = input.records ?? [];
  const byId = new Map(records.map((record) => [record.id, record]));
  return searchRecords(records, { query: input.question, limit, ...input.scope }).map((result) => ({
    ...result,
    excerpt: byId.get(result.id)?.content.slice(0, 1600) ?? result.excerpt
  }));
}

export function createContextPrompt(input: AskInput, sources: SearchResult[]): string {
  return [
    `Question: ${input.question}`,
    '',
    'Sources:',
    sources.length ? sources.map((source, index) => [
      `[${index + 1}] ${source.title}${source.section ? `: ${source.section}` : ''}`,
      `URL: ${source.url}`,
      source.excerpt
    ].join('\n')).join('\n\n') : 'No local documentation source matched.'
  ].join('\n');
}
