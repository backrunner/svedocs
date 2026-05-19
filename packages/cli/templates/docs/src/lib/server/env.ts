export function getRuntimeEnv(): Record<string, unknown> {
  return typeof process !== 'undefined' ? process.env : {};
}
