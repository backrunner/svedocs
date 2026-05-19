export function getRuntimeEnv(platformEnv: Record<string, unknown> | undefined): Record<string, unknown> {
  return platformEnv ?? (typeof process !== 'undefined' ? process.env : {});
}
