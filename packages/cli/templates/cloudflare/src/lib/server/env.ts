import { env } from 'cloudflare:workers';

export function getRuntimeEnv(
  options: { ignoreDevBindings?: string[] } = {}
): Record<string, unknown> {
  if (!import.meta.env.DEV || remoteBindingsEnabled() || !options.ignoreDevBindings?.length) return env;
  const filtered = { ...env };
  for (const binding of options.ignoreDevBindings) delete filtered[binding];
  return filtered;
}

function remoteBindingsEnabled(): boolean {
  return typeof process !== 'undefined' && process.env.SVEDOCS_REMOTE_BINDINGS === 'true';
}
