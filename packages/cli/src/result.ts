export interface CliResult {
  command: string;
  args: string[];
  ok: boolean;
  message: string;
}

export function ok(command: string, args: string[], message: string): CliResult {
  return { command, args, ok: true, message };
}

export function fail(command: string, args: string[], message: string): CliResult {
  return { command, args, ok: false, message };
}
