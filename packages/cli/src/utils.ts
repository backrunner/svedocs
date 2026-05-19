import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function spawnCommand(
  command: string,
  args: string[],
  env: Record<string, string> = {},
  options: { cwd?: string } = {}
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      cwd: options.cwd,
      env: { ...process.env, ...env }
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        message: `${command} ${args.join(' ')} exited with code ${code ?? 0}.`
      });
    });
    child.on('error', (error) => {
      resolve({ ok: false, message: error.message });
    });
  });
}

export function readOption(args: string[], name: string): string | undefined {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function readOptions(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg?.startsWith(`${name}=`)) {
      values.push(arg.slice(name.length + 1));
      continue;
    }
    const next = args[index + 1];
    if (arg === name && next) {
      values.push(next);
      index += 1;
    }
  }
  return values;
}

export function readCsvOptions(args: string[], name: string): string[] {
  return readOptions(args, name).flatMap((value) => value.split(',').map((item) => item.trim()).filter(Boolean));
}

export function readPositiveIntegerOption(args: string[], name: string): number | undefined {
  const value = Number(readOption(args, name));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export function readNonNegativeIntegerOption(args: string[], name: string): number | undefined {
  const value = Number(readOption(args, name));
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

export async function readOgFonts(args: string[]) {
  const fontPaths = readOptions(args, '--font');
  return Promise.all(
    fontPaths.map(async (fontPath, index) => ({
      name: index === 0 ? 'Inter' : `SvedocsFont${index + 1}`,
      data: await readFile(path.resolve(process.cwd(), fontPath)),
      weight: 400 as const,
      style: 'normal' as const
    }))
  );
}
