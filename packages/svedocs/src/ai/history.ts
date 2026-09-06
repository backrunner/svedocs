import type { ChatMessage } from './types.js';

/** Keep recent context within the API's message, character and UTF-8 limits. */
export function trimChatHistory(messages: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  const encoder = new TextEncoder();
  let characters = 0;
  let bytes = 0;
  for (let index = messages.length - 1; index >= 0 && result.length < 28; index -= 1) {
    const message = messages[index]!;
    const content = message.content.slice(0, 8000);
    if (!content.trim()) continue;
    const next = { role: message.role, content };
    const size = encoder.encode(JSON.stringify(next)).byteLength;
    if (characters + content.length > 24000 || bytes + size > 44000) break;
    characters += content.length;
    bytes += size;
    result.unshift(next);
  }
  // Do not start the provider conversation with an orphaned assistant reply.
  while (result[0]?.role === 'assistant') result.shift();
  return result;
}
