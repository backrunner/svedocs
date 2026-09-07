/** Coalesce bursts and serialize refreshes. Every waiter sees the newest completed snapshot. */
export function createRefreshQueue(run: (changed: Set<string>) => Promise<void>) {
  let pending: Promise<void> | undefined;
  const files = new Set<string>();
  function refresh(file?: string): Promise<void> {
    if (file) files.add(file);
    if (!pending) {
      pending = (async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
        do {
          const changed = new Set(files);
          files.clear();
          try { await run(changed); }
          catch (error) { for (const file of changed) files.add(file); throw error; }
        } while (files.size);
      })().finally(() => { pending = undefined; });
    }
    return pending;
  }
  refresh.mark = (file: string) => { files.add(file); };
  refresh.isPending = () => pending !== undefined;
  return refresh;
}
