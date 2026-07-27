import { defaultAgentUserAgents } from '../core/config.js';

export const DEFAULT_AGENT_USER_AGENTS = defaultAgentUserAgents;

export function isAgentUserAgent(userAgent: string | null | undefined, userAgents: readonly string[] = DEFAULT_AGENT_USER_AGENTS): boolean {
  if (!userAgent) return false;
  const normalized = userAgent.toLowerCase();
  return userAgents.some((candidate) => candidate.trim().length > 0 && normalized.includes(candidate.trim().toLowerCase()));
}
